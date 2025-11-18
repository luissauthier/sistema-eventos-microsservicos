# servico_eventos/src/main.py

from fastapi import (
    FastAPI, Depends, HTTPException, status, Query, BackgroundTasks, Request
)
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List
from datetime import datetime, timedelta
import httpx
import asyncio

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
        data_evento=data.data_evento
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

    db.add(presenca)
    db.commit()
    db.refresh(presenca)

    # EMISSÃO AUTOMÁTICA DE CERTIFICADO
    cert_existente = db.query(models.Certificado).filter_by(inscricao_id=insc.id).first()
    if not cert_existente:
        cert = models.Certificado(
            inscricao_id=insc.id,
            evento_id=insc.evento_id,
            codigo_unico=models.generate_cert_hash()
        )
        db.add(cert)
        db.commit()

    background.add_task(send_notification_guaranteed, {
        "tipo": "checkin",
        "destinatario": None,  # carregamos se necessário
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
            continue

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

    return success({
        "sincronizadas": len(results),
        "ids": results
    })