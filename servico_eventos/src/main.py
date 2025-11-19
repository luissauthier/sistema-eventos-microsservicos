# servico_eventos/src/main.py
from fastapi import (
    FastAPI, Depends, HTTPException, status, Query, BackgroundTasks, Request
)
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List
from datetime import datetime, timedelta
import httpx
import asyncio
from schemas import CheckinTokenResponse
from uuid import UUID

# Infraestrutura corporativa
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import (
    ServiceError,
    service_error_handler
)
from servico_comum.responses import success

# Domínio local
import models
import schemas
from security import get_current_user, get_current_admin_user, User
from database import engine, get_db


# ============================================================
#  INICIALIZAÇÃO DO SERVIÇO
# ============================================================

models.Base.metadata.create_all(bind=engine)

logger = configure_logger("servico_eventos")

app = FastAPI(
    title="Serviço de Eventos e Inscrições",
    version="2.0.0",
    description="Serviço robusto para gestão de eventos, inscrições, presença, certificados e integração offline."
)

app.add_middleware(RequestIDMiddleware)

# Handlers globais de exceções
app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)

# ============================================================
#  FUNÇÃO AUXILIAR: EMITIR CERTIFICADO E NOTIFICAR
# ============================================================

async def solicitar_emissao_certificado_e_notificacao(insc: models.Inscricao, user: User, evento: models.Evento):
    """
    Encapsula a lógica de chamada HTTP para Certificados e Notificações,
    garantindo que não usamos o db.query aqui (melhor para async).
    """
    
    # 1. Disparar Certificado (Lógica da rota Admin, mas encapsulada)
    # Assumindo que a função get_user_by_id está implementada (Etapa 2.1)
    async with httpx.AsyncClient(timeout=3) as client:
        try:
            # Buscar dados frescos do usuário
            resp_user = await client.get(f"http://servico_usuarios:8000/usuarios/{insc.usuario_id}")
            resp_user.raise_for_status()
            dados_usuario = resp_user.json()
            user_email = dados_usuario.get("email") or "email_nao_informado@evento.com"

            # Dados do Evento
            nome_evento = evento.nome
            data_evento = str(evento.data_evento)
            tpl_certificado = getattr(evento, "template_certificado", "default")
            
            payload_cert = {
                "inscricao_id": insc.id,
                "usuario_id": insc.usuario_id,
                "evento_id": insc.evento_id,
                "usuario_nome": insc.usuario_username,
                "usuario_email": user_email,
                "evento_nome": nome_evento,
                "evento_data": data_evento,
                "template_certificado": tpl_certificado 
            }

            # Chamada ao Microsserviço de Certificados
            resp_cert = await client.post(
                "http://servico_certificados:8000/interno/certificados/emitir_automatico",
                json=payload_cert
            )
            resp_cert.raise_for_status()
            logger.info("certificado_emitido_qr_code", extra={"inscricao_id": insc.id})
            
            # 2. Notificação de Check-in
            payload_notif = {
                "tipo": "checkin",
                "destinatario": user_email,
                "nome": user.full_name or user.username,
                "nome_evento": evento.nome
            }
            # Reutiliza a função garantida (com retry)
            await send_notification_guaranteed(payload_notif)


        except Exception as e:
            logger.error("falha_fluxo_qr_code", extra={"erro": str(e), "inscricao": insc.id})

# ============================================================
#  FUNÇÃO DE NOTIFICAÇÕES (GARANTIDA - 3 RETENTATIVAS)
# ============================================================

NOTIFICATION_URL = "http://servico_notificacoes:8004/emails"

async def send_notification_guaranteed(payload: dict):
    delay = 0.5
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                await client.post(NOTIFICATION_URL, json=payload)
            logger.info("notification_sent", extra=payload)
            return
        except httpx.RequestError as e:
            logger.error("notification_failed", extra={"error": str(e), "attempt": attempt + 1})
            await asyncio.sleep(delay)
            delay *= 2  # backoff exponencial


# ============================================================
#  MIDDLEWARE DE LOG
# ============================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.utcnow()
    response = await call_next(request)
    duration = (datetime.utcnow() - start).total_seconds() * 1000

    logger.info("request_completed", extra={
        "path": request.url.path,
        "method": request.method,
        "status": response.status_code,
        "duration_ms": duration,
        "request_id": getattr(request.state, "request_id", None)
    })

    return response


# ============================================================
#                     ROTAS PÚBLICAS — EVENTOS
# ============================================================

@app.get("/eventos", response_model=List[schemas.Evento], tags=["Eventos"])
def list_eventos(db: Session = Depends(get_db)):
    return db.query(models.Evento).all()


@app.get("/eventos/{id}", response_model=schemas.Evento, tags=["Eventos"])
def get_evento(id: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter_by(id=id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)
    return evento


# ============================================================
#                 ADMIN – CRIAÇÃO DE EVENTOS
# ============================================================

@app.post("/admin/eventos", response_model=schemas.Evento, status_code=201, tags=["Admin"])
def create_evento(
    data: schemas.EventoCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    evento = models.Evento(
        nome=data.nome,
        descricao=data.descricao,
        data_evento=data.data_evento,
        template_certificado=data.template_certificado
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    logger.info("evento_created", extra={"evento_id": evento.id})
    return evento

@app.patch("/admin/eventos/{id}", response_model=schemas.Evento, tags=["Admin"])
def update_evento(
    id: int,
    update_data: schemas.EventoUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # 1. Buscar evento
    evento = db.query(models.Evento).filter_by(id=id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    # 2. Atualizar campos enviados
    dados = update_data.model_dump(exclude_unset=True)
    
    for key, value in dados.items():
        setattr(evento, key, value)

    evento.updated_at = datetime.utcnow()
    
    # 3. Salvar
    db.add(evento)
    db.commit()
    db.refresh(evento)
    
    logger.info("evento_updated", extra={"evento_id": evento.id})
    return evento


# ============================================================
#                USUÁRIO — INSCRIÇÃO EM EVENTOS
# ============================================================

@app.post("/inscricoes", response_model=schemas.Inscricao, status_code=201, tags=["Inscrições"])
def create_inscricao(
    body: schemas.InscricaoCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    evento = db.query(models.Evento).filter_by(id=body.evento_id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    # Idempotência
    existente = db.query(models.Inscricao).filter_by(
        usuario_id=user.id,
        evento_id=body.evento_id
    ).first()
    if existente:
        if existente.status == models.InscricaoStatus.CANCELADA:
            existente.status = models.InscricaoStatus.ATIVA
            existente.updated_at = datetime.utcnow()
            
            db.add(existente)
            db.commit()
            db.refresh(existente)
            
            # Opcional: Enviar e-mail de "Re-inscrição"
            background.add_task(send_notification_guaranteed, {
                "tipo": "inscricao",
                "destinatario": user.email,
                "nome": user.full_name or user.username,
                "nome_evento": evento.nome
            })
            
        # Retorna a inscrição (agora ativa ou já ativa)
        return existente

    insc = models.Inscricao(
        evento_id=body.evento_id,
        usuario_id=user.id,
        usuario_username=user.username
    )

    db.add(insc)
    db.commit()
    db.refresh(insc)

    background.add_task(send_notification_guaranteed, {
        "tipo": "inscricao",
        "destinatario": user.email,
        "nome": user.full_name or user.username,
        "nome_evento": evento.nome
    })

    return insc

# ============================================================
#              USUÁRIO — LISTAR MINHAS INSCRIÇÕES
# ============================================================

@app.get("/inscricoes/me", response_model=List[schemas.InscricaoDetalhes], tags=["Inscrições"])
def minhas_inscricoes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(models.Inscricao).options(
        joinedload(models.Inscricao.evento),
        selectinload(models.Inscricao.presencas)
    ).filter_by(usuario_id=user.id).all()

# ============================================================
#        USUÁRIO — CONSULTA DE UMA INSCRIÇÃO ESPECÍFICA
# ============================================================

@app.get("/inscricoes/{id}", response_model=schemas.Inscricao, tags=["Inscrições"])
def get_inscricao(
    id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    insc = db.query(models.Inscricao).filter_by(id=id).first()
    if not insc:
        raise ServiceError("Inscrição não encontrada", 404)

    if insc.usuario_id != user.id:
        raise ServiceError("Acesso negado", 403)

    return insc

# ============================================================
#           USUÁRIO — CANCELAMENTO (PATCH, NÃO DELETE)
# ============================================================

@app.patch("/inscricoes/{id}/cancelar", tags=["Inscrições"])
def cancelar_inscricao(
    id: int,
    body: schemas.InscricaoCancelamento,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Log inicial
    logger.info(f"DEBUG: Tentando cancelar inscricao_id={id} para usuario_id={user.id}")

    # 1. Verifica existência
    insc = db.query(models.Inscricao).filter_by(id=id).first()
    if not insc:
        logger.error(f"DEBUG: Inscrição {id} não encontrada no banco.")
        raise ServiceError("Inscrição não encontrada", 404)

    if insc.usuario_id != user.id:
        raise ServiceError("Você não pode cancelar esta inscrição", 403)

    # 2. Verifica presença
    presenca = db.query(models.Presenca).filter_by(inscricao_id=id).first()
    if presenca:
        raise ServiceError("Não é possível cancelar: já houve presença", 400)

    # 3. UPDATE DIRETO COM DEBUG E .value
    # Usamos .value para garantir que enviamos "cancelada" (str) e não o objeto Enum
    rows = db.query(models.Inscricao).filter(models.Inscricao.id == id).update({
        "status": models.InscricaoStatus.CANCELADA.value, 
        "updated_at": datetime.utcnow()
    })
    
    db.commit()
    
    # Log do resultado do banco
    logger.info(f"DEBUG: Update executado. Linhas afetadas no banco: {rows}")
    
    if rows == 0:
        # Se isso acontecer, algo muito estranho ocorreu (concorrência ou filtro errado)
        logger.warning("ALERTA: O comando update rodou mas nenhuma linha foi alterada!")

    # 4. Recupera dados frescos para o e-mail
    # (Buscamos o evento direto para não depender do objeto 'insc' antigo)
    nome_evento = db.query(models.Evento).filter_by(id=insc.evento_id).first().nome

    user_email = getattr(user, 'email', None)
    background.add_task(send_notification_guaranteed, {
        "tipo": "cancelamento",
        "destinatario": user_email,
        "nome": user.full_name or user.username,
        "nome_evento": nome_evento
    })

    return success("Inscrição cancelada com sucesso.")


# ============================================================
#                     ADMIN — LISTAR TODAS
# ============================================================

@app.get("/admin/inscricoes/all", response_model=List[schemas.Inscricao], tags=["Admin"])
def listar_todas_inscricoes(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(models.Inscricao).options(
        joinedload(models.Inscricao.evento)
    ).all()

@app.get("/admin/inscricoes", response_model=List[schemas.Inscricao])
def listar_todas_inscricoes_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):    
    # Retorna TODAS as inscrições do sistema para o App Local baixar
    inscricoes = db.query(models.Inscricao).all()
    return inscricoes


# ============================================================
#         ADMIN — CRIAR INSCRIÇÃO PARA TERCEIROS
# ============================================================

@app.post("/admin/inscricoes", response_model=schemas.Inscricao, status_code=201, tags=["Admin"])
def admin_create_inscricao(
    body: schemas.InscricaoAdminCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    evento = db.query(models.Evento).filter_by(id=body.evento_id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    # CONSULTA AO SERVIÇO DE USUÁRIOS
    async def get_user(usuario_id):
        async with httpx.AsyncClient() as client:
            r = await client.get(f"http://servico_usuarios:8000/usuarios/{usuario_id}")
            if r.status_code == 404:
                raise ServiceError("Usuário não encontrado", 404)
            r.raise_for_status()
            return r.json()

    usuario = asyncio.run(get_user(body.usuario_id))

    existente = db.query(models.Inscricao).filter_by(
        usuario_id=body.usuario_id,
        evento_id=body.evento_id
    ).first()

    if existente:
        return existente

    insc = models.Inscricao(
        evento_id=body.evento_id,
        usuario_id=body.usuario_id,
        usuario_username=usuario["username"]
    )
    db.add(insc)
    db.commit()
    db.refresh(insc)

    background.add_task(send_notification_guaranteed, {
        "tipo": "inscricao",
        "destinatario": usuario["email"],
        "nome": usuario["full_name"] or usuario["username"],
        "nome_evento": evento.nome
    })

    return insc


# ============================================================
#                 ADMIN — CHECK-IN (PRESENÇA)
# ============================================================

@app.post("/admin/presencas/checkin", response_model=schemas.Presenca, status_code=201, tags=["Admin"])
def registrar_presenca(
    body: schemas.PresencaCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    insc = db.query(models.Inscricao).filter_by(id=body.inscricao_id).first()
    if not insc:
        raise ServiceError("Inscrição não encontrada", 404)

    # Idempotência
    existente = db.query(models.Presenca).filter_by(inscricao_id=body.inscricao_id).first()
    if existente:
        return existente

    presenca = models.Presenca(
        inscricao_id=insc.id,
        usuario_id=insc.usuario_id,
        evento_id=insc.evento_id,
        origem=body.origem
    )

    cert_existente = db.query(models.Certificado).filter_by(inscricao_id=insc.id).first()
    if cert_existente:
        cert_existente.origem_automatica = True

    db.add(presenca)
    db.commit()
    db.refresh(presenca)

    # EMISSÃO AUTOMÁTICA DE CERTIFICADO
    async def solicitar_emissao_certificado():
        timeout_config = httpx.Timeout(5.0, connect=2.0)
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            try:
                # A) Buscar dados frescos do usuário (Email é obrigatório para o certificado)
                # URL interna do docker-compose
                resp_user = await client.get(f"http://servico_usuarios:8000/usuarios/{insc.usuario_id}")
                resp_user.raise_for_status()
                dados_usuario = resp_user.json()
                user_email = dados_usuario.get("email", "email_nao_informado@evento.com")

                # B) Carregar dados do evento (Template)
                # Como 'insc.evento' pode ser lazy load, garantimos o acesso ou query
                # Aqui acessamos via relação do SQLAlchemy (assumindo joinedload ou acesso direto)
                nome_evento = insc.evento.nome
                data_evento = str(insc.evento.data_evento)
                # --- USO DO NOVO CAMPO DA ETAPA 2 ---
                tpl_certificado = getattr(insc.evento, "template_certificado", "default")

                # C) Payload para o Serviço de Certificados
                payload = {
                    "inscricao_id": insc.id,
                    "usuario_id": insc.usuario_id,
                    "evento_id": insc.evento_id,
                    "usuario_nome": insc.usuario_username,
                    "usuario_email": user_email,
                    "evento_nome": nome_evento,
                    "evento_data": data_evento,
                    "template_certificado": tpl_certificado 
                }

                # D) Chamada ao Microsserviço de Certificados
                resp_cert = await client.post(
                    "http://servico_certificados:8000/interno/certificados/emitir_automatico",
                    json=payload
                )
                resp_cert.raise_for_status()
                logger.info("certificado_emitido_sucesso", extra={"inscricao_id": insc.id})
                
            except Exception as e:
                # Resiliência: Check-in não falha se certificado falhar (Tenta depois ou loga erro)
                logger.error("falha_integracao_certificado", extra={"erro": str(e), "inscricao": insc.id})

    # Execução síncrona da tarefa assíncrona (para garantir que foi solicitado)
    # Em produção pesada, usaríamos fila (RabbitMQ/Redis), mas aqui asyncio.run atende.
    asyncio.run(solicitar_emissao_certificado())

    # 4. Notificação
    background.add_task(send_notification_guaranteed, {
        "tipo": "checkin",
        "destinatario": None, # O serviço de notificação vai tentar enviar se tiver destinatario, mas aqui deixamos None pois o foco é o registro
        "nome_evento": insc.evento.nome
    })

    return presenca


# ============================================================
#          CERTIFICADOS — VALIDAR (PÚBLICO)
# ============================================================

@app.get("/certificados/validar/{codigo}", response_model=schemas.CertificadoValidacaoResponse, tags=["Certificados"])
def validar_certificado(
    codigo: str,
    db: Session = Depends(get_db)
):
    cert = db.query(models.Certificado).filter_by(codigo_unico=codigo).first()
    if not cert:
        return schemas.CertificadoValidacaoResponse(valido=False)

    return schemas.CertificadoValidacaoResponse(
        valido=True,
        evento=cert.evento.nome,
        usuario=cert.inscricao.usuario_username,
        data_emissao=cert.data_emissao
    )


# ============================================================
#          CERTIFICADOS — EMISSÃO MANUAL (ADMIN)
# ============================================================

@app.post("/admin/certificados/emissao", response_model=schemas.Certificado, tags=["Admin"])
def emitir_certificado(
    inscricao_id: int = Query(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    insc = db.query(models.Inscricao).filter_by(id=inscricao_id).first()
    if not insc:
        raise ServiceError("Inscrição não encontrada", 404)

    existente = db.query(models.Certificado).filter_by(inscricao_id=inscricao_id).first()
    if existente:
        return existente

    cert = models.Certificado(
        inscricao_id=insc.id,
        evento_id=insc.evento_id,
        codigo_unico=models.generate_cert_hash()
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


# ============================================================
#      ADMIN — SINCRONIZAÇÃO OFFLINE (PRESENÇAS)
# ============================================================

@app.post("/admin/sync/presencas", tags=["Admin"])
def sync_presencas_offline(
    payload: schemas.SyncPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    results = []

    for item in payload.presencas:
        insc = db.query(models.Inscricao).filter_by(id=item.inscricao_id).first()
        if not insc:
            continue

        existente = db.query(models.Presenca).filter_by(inscricao_id=item.inscricao_id).first()
        if existente:
            background_tasks.add_task(processar_geracao_certificado, item.inscricao_id, get_current_admin_user.token)
            results.append(existente.id)
            continue
        try:
            token = get_current_admin_user.token

            presenca = models.Presenca(
                inscricao_id=insc.id,
                usuario_id=insc.usuario_id,
                evento_id=insc.evento_id,
                origem=models.PresencaOrigem.SINCRONIZADO,
                data_checkin=item.data_checkin
            )

            db.add(presenca)
            db.commit()
            results.append(presenca.id)

            background_tasks.add_task(processar_geracao_certificado, item.inscricao_id, token)
        except Exception as e:
            logger.error(f"[SYNC] Erro ao salvar presença no banco: {e}")
            db.rollback()

    return success({
        "sincronizadas": len(results),
        "ids": results
    })

# --- FUNÇÃO AUXILIAR DE GERAÇÃO (RODA EM BACKGROUND) ---
async def processar_geracao_certificado(inscricao_id: int, token_admin: str):
    """
    Tarefa em background que chama o serviço de certificados.
    Não trava o App Local esperando resposta.
    """
    logger.info(f"[BG-TASK] Iniciando processamento de certificado para inscricao {inscricao_id}")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Buscar dados da inscrição para saber quem é o usuário e evento
            # Como estamos no mesmo serviço (Eventos), podemos usar DB direto ou API interna?
            # Para simplificar e evitar problemas de sessão async, vamos assumir que o servico_certificados
            # é esperto o suficiente para buscar os dados se passarmos o ID, 
            # OU passamos os dados mastigados aqui.
            
            # Vamos tentar a rota padrão de criação de certificado
            payload = {
                "inscricao_id": inscricao_id,
                # O serviço de certificados deve ser capaz de buscar o resto
            }
            
            # ROTA INTERNA DO DOCKER
            url_cert = "http://servico_certificados:8000/certificados" # ou /internal/...
            
            headers = {"Authorization": f"Bearer {token_admin}"}
            
            logger.info(f"[BG-TASK] Chamando POST {url_cert}")
            resp = await client.post(url_cert, json=payload, headers=headers)
            
            if resp.status_code in [200, 201]:
                logger.info(f"[BG-TASK] Certificado gerado com sucesso! ID: {inscricao_id}")
            elif resp.status_code == 409:
                 logger.info(f"[BG-TASK] Certificado já existia para ID: {inscricao_id}")
            else:
                logger.error(f"[BG-TASK] Erro ao gerar: {resp.status_code} - {resp.text}")

        except Exception as e:
            logger.error(f"[BG-TASK] Falha de conexão com microsserviço certificados: {str(e)}")

# ============================================================
#        USUÁRIO – CONSUMO DE TOKEN QR CODE (CHECK-IN RÁPIDO)
# ============================================================

@app.post(
    "/checkin-qr/{token_uuid}",
    response_model=schemas.CheckinQRCodeResult,
    tags=["Check-in"]
)
def consume_checkin_qr(
    token_uuid: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    # Esta rota exige que o usuário esteja logado no Portal Web!
    user: User = Depends(get_current_user) 
):
    # 1. Buscar e Validar Token
    token_obj = db.query(models.CheckinToken).filter_by(token=token_uuid).first()

    if not token_obj or not token_obj.is_active or token_obj.data_expiracao < datetime.utcnow():
        raise ServiceError("Token de check-in inválido ou expirado.", 400)

    evento_id = token_obj.evento_id
    
    # 2. Verificar/Criar Inscrição (Inscrição Rápida)
    insc = db.query(models.Inscricao).filter_by(
        usuario_id=user.id,
        evento_id=evento_id
    ).first()

    is_new_inscricao = False
    
    if not insc:
        # Se não está inscrito, inscreve automaticamente (Inscrição Rápida!)
        evento = db.query(models.Evento).filter_by(id=evento_id).first()
        if not evento:
             raise ServiceError("Evento do token não encontrado", 404)
        
        insc = models.Inscricao(
            evento_id=evento_id,
            usuario_id=user.id,
            usuario_username=user.username,
            status=models.InscricaoStatus.ATIVA
        )
        db.add(insc)
        db.commit()
        db.refresh(insc)
        is_new_inscricao = True

        # Dispara notificação de inscrição (background)
        background.add_task(send_notification_guaranteed, {
            "tipo": "inscricao",
            "destinatario": user.email,
            "nome": user.full_name or user.username,
            "nome_evento": evento.nome
        })
    elif insc.status == models.InscricaoStatus.CANCELADA:
        # Se a inscrição estava cancelada, reativa (Comportamento de idempotência)
        insc.status = models.InscricaoStatus.ATIVA
        db.commit()


    # 3. Registrar Presença (Check-in)
    existente = db.query(models.Presenca).filter_by(inscricao_id=insc.id).first()
    
    if existente:
        db.query(models.CheckinToken).filter_by(token=token_uuid).update({"is_active": False})
        db.commit()
        return schemas.CheckinQRCodeResult(
            message="Check-in já estava registrado.",
            inscricao_id=insc.id,
            presenca_registrada=True
        )

    presenca = models.Presenca(
        inscricao_id=insc.id,
        usuario_id=insc.usuario_id,
        evento_id=insc.evento_id,
        origem=models.PresencaOrigem.QR_CODE
    )

    db.add(presenca)
    
    # 4. Invalidação do Token e Commit
    db.query(models.CheckinToken).filter_by(token=token_uuid).update({"is_active": False})
    db.commit()
    db.refresh(presenca)
    
    # 5. Disparar Certificado e Notificação de Presença (Background)
    # Reutilizamos a lógica de emissão de certificado e notificação de check-in (como no admin)
    
    # Busca o evento para pegar dados para notificação/certificado se for uma inscrição nova
    evento = db.query(models.Evento).filter_by(id=evento_id).first()
    
    # Dispara a emissão de certificado e notificação de check-in
    background.add_task(solicitar_emissao_certificado_e_notificacao, insc, user, evento)


    return schemas.CheckinQRCodeResult(
        message=f"Inscrição {'e ' if is_new_inscricao else ''} check-in registrados com sucesso!",
        inscricao_id=insc.id,
        presenca_registrada=True
    )

# ============================================================
#        ADMIN – GERAÇÃO DE TOKEN QR CODE (CHECK-IN)
# ============================================================

@app.post(
    "/admin/checkin/generate", 
    response_model=schemas.CheckinTokenResponse, 
    status_code=status.HTTP_201_CREATED,
    tags=["admin"]
)
def generate_checkin_token(
    data: schemas.CheckinTokenCreate, 
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Gera um token de uso único e tempo limitado para check-in por QR Code.
    """
    evento_id = data.evento_id
    duracao_minutos = data.duracao_minutos

    # 1. Verificar se o evento existe
    evento = db.query(models.Evento).filter(models.Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado."
        )

    # 2. Definir expiração: Usando a duração enviada no body
    expiration = datetime.utcnow() + timedelta(minutes=duracao_minutos)
    
    # 3. Criar o novo token
    new_token = models.CheckinToken(
        evento_id=evento_id,
        data_expiracao=expiration,
        is_active=True
    )
    
    # 4. Salvar no banco de dados
    db.add(new_token)
    db.commit()
    db.refresh(new_token)

    public_url = f"http://localhost/checkin-qr/{new_token.token}"
    
    return schemas.CheckinTokenResponse(
    # Assumimos que o schema de resposta tem estes nomes, 
    # se não, ajuste os nomes das chaves (ex: evento_id -> event_id)
    token=new_token.token,
    evento_id=new_token.evento_id, 
    data_expiracao=new_token.data_expiracao, 
    is_active=new_token.is_active,
    
    # ESTE CAMPO ESTAVA FALTANDO!
    url_publica=public_url 
    )

# ============================================================
#        CHECK-IN – VALIDAÇÃO DE TOKEN E REGISTRO DE PRESENÇA
# ============================================================

@app.post(
    "/checkin/validate", 
    response_model=schemas.PresencaResponse, 
    status_code=status.HTTP_201_CREATED,
    tags=["checkin"]
)
def validate_token_and_register_presence(
    data: schemas.TokenAndUserCheckin,
    db: Session = Depends(get_db)
):
    """
    Valida um token de check-in e registra a presença de um usuário para um evento.
    """
    token_uuid: UUID = data.token
    user_id: int = data.user_id

    # 1. Buscar o token
    checkin_token = db.query(models.CheckinToken).filter(models.CheckinToken.token == token_uuid).first()

    if not checkin_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de Check-in não encontrado ou inválido."
        )

    # 2. Validar o Token
    if checkin_token.data_expiracao < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expirado."
        )
    if checkin_token.is_used: # Assumindo que is_used é o booleano de uso
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token já utilizado."
        )

    # 3. Buscar a Inscrição do Usuário para o Evento
    inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.usuario_id == user_id,
        models.Inscricao.evento_id == checkin_token.evento_id
    ).first()

    if not inscricao:
        # Pela regra do projeto, um usuário não inscrito pode fazer check-in (Caso 2).
        # Para simplificar o backend, o app-local deve garantir que o usuário esteja inscrito (ou crie a inscrição).
        # Se for um usuário já existente, a inscrição é obrigatória para registrar a presença.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não possui inscrição válida para este evento."
        )

    # 4. Verificar se a Presença já foi Registrada
    presenca_existente = db.query(models.Presenca).filter(
        models.Presenca.inscricao_id == inscricao.id
    ).first()

    if presenca_existente:
        return schemas.PresencaResponse(
            id=presenca_existente.id,
            inscricao_id=presenca_existente.inscricao_id,
            data_registro=presenca_existente.data_registro,
            status="Presença já registrada anteriormente."
        )

    # 5. Registrar a Presença
    new_presenca = models.Presenca(
        inscricao_id=inscricao.id,
        data_registro=datetime.utcnow()
    )
    
    # 6. Marcar o Token como usado (para tokens de uso único)
    checkin_token.is_used = True

    db.add(new_presenca)
    db.commit()
    db.refresh(new_presenca)

    return schemas.PresencaResponse(
        id=new_presenca.id,
        inscricao_id=new_presenca.inscricao_id,
        data_registro=new_presenca.data_registro,
        status="Presença registrada com sucesso via QR Code."
    )