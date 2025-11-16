# servico_eventos/src/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, Query, BackgroundTasks
import httpx # Para fazer chamadas HTTP
import asyncio # Para rodar o "fire-and-forget"
from sqlalchemy.orm import joinedload

# Importa nossos módulos locais
import models
import schemas
import security
from database import engine, get_db

# Cria as tabelas no DB (eventos, inscricoes, presencas)
models.Base.metadata.create_all(bind=engine)

NOTIFICATION_SERVICE_URL = "http://servico_notificacoes:8004/emails"

async def send_notification(payload: dict):
    """
    Função "dispare e esqueça" para enviar e-mails.
    """
    try:
        async with httpx.AsyncClient() as client:
            await client.post(NOTIFICATION_SERVICE_URL, json=payload)
        # Se falhar, nós (propositalmente) não fazemos nada.
        # Em um sistema de produção, logaríamos o erro aqui.
    except httpx.RequestError as e:
        print(f"ALERTA: Falha ao conectar com o serviço de notificação: {e}")

app = FastAPI(
    title="Serviço de Eventos e Inscrições",
    version="1.0.0"
)

# --- Endpoints de Eventos (Públicos) ---

@app.get("/eventos", response_model=List[schemas.Evento])
def read_eventos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [cite_start]Consulta todos os eventos vigentes. [cite: 48]
    Esta rota é PÚBLICA, não requer token.
    """
    eventos = db.query(models.Evento).offset(skip).limit(limit).all()
    return eventos

@app.get("/eventos/{id}", response_model=schemas.Evento)
def read_evento(id: int, db: Session = Depends(get_db)):
    """
    [cite_start]Consulta um evento específico. [cite: 48]
    Esta rota também é PÚBLICA.
    """
    evento = db.query(models.Evento).filter(models.Evento.id == id).first()
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return evento

@app.post("/eventos", response_model=schemas.Evento, status_code=status.HTTP_201_CREATED)
def create_evento(
    evento: schemas.EventoCreate, 
    db: Session = Depends(get_db),
    # Protegido! Só usuários logados podem criar eventos.
    current_username: str = Depends(security.get_current_user)
):
    """
    Cria um novo evento.
    Esta rota é PROTEGIDA.
    """
    db_evento = models.Evento(
        nome=evento.nome,
        descricao=evento.descricao,
        data_evento=evento.data_evento
    )
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento

# --- Endpoints de Inscrições (Protegidos) ---

@app.post("/inscricoes", response_model=schemas.Inscricao, status_code=status.HTTP_201_CREATED)
def create_inscricao(
    inscricao: schemas.InscricaoCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user),
):
    """
    Registra uma inscrição.
    Esta rota é PROTEGIDA.
    """
    
    # Verifica se o evento existe
    evento = db.query(models.Evento).filter(models.Evento.id == inscricao.evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
        
    # ---- CORREÇÃO DA DÍVIDA TÉCNICA ----
    # Agora usamos os dados reais do token
    db_inscricao = models.Inscricao(
        evento_id=inscricao.evento_id,
        usuario_id=current_user.id,          # <-- CORRIGIDO
        usuario_username=current_user.username # <-- CORRIGIDO
    )
    db.add(db_inscricao)
    db.commit()
    db.refresh(db_inscricao)
    payload = {
        "tipo": "inscricao",
        "destinatario": current_user.email,
        "nome": current_user.full_name or current_user.username,
        "nome_evento": "Nome do Evento" # TODO: Buscar o nome do evento
    }
    background_tasks.add_task(send_notification, payload)
    return db_inscricao

# --- Endpoint de Presença (Protegido - Nível Atendente) ---

@app.post("/presencas", response_model=schemas.Presenca, status_code=status.HTTP_201_CREATED)
def register_presenca(
    presenca: schemas.PresencaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: security.User = Depends(security.get_current_admin_user)
):
    """
    Registra uma presença (check-in) para uma inscrição.
    Esta rota é PROTEGIDA e restrita a Atendentes (Admins).
    """
    
    # 1. Encontra a inscrição que está fazendo check-in
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == presenca.inscricao_id
    ).first()

    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 2. Verifica se o check-in já foi feito
    db_presenca_existente = db.query(models.Presenca).filter(
        models.Presenca.inscricao_id == presenca.inscricao_id
    ).first()
    
    if db_presenca_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in já realizado para esta inscrição"
        )

    # 3. Registra a presença
    db_presenca = models.Presenca(
        inscricao_id=db_inscricao.id,
        usuario_id=db_inscricao.usuario_id,
        evento_id=db_inscricao.evento_id
    )
    
    db.add(db_presenca)
    db.commit()
    db.refresh(db_presenca)
    
    payload = {
        "tipo": "checkin",
        "destinatario": "email_do_participante@teste.com", # TODO: Buscar e-mail
        "nome": "Nome do Participante", # TODO: Buscar nome
        "nome_evento": "Nome do Evento" # TODO: Buscar nome
    }
    payload["destinatario"] = current_admin.email
    payload["nome"] = current_admin.full_name or current_admin.username
    
    asyncio.create_task(send_notification(payload))

    return db_presenca

@app.delete("/inscricoes", status_code=status.HTTP_200_OK)
def delete_inscricao(
    # O ID é passado como um parâmetro de consulta, ex: /inscricoes?id=1
    background_tasks: BackgroundTasks,
    inscricao_id: int = Query(..., alias="id"), 
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Cancela uma inscrição.
    Esta rota é PROTEGIDA.
    """
    
    # 1. Encontra a inscrição no banco de dados
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == inscricao_id
    ).first()

    # 2. Verifica se a inscrição existe
    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 3. VERIFICAÇÃO DE SEGURANÇA CRÍTICA:
    # O usuário logado (do token) é o dono desta inscrição?
    if db_inscricao.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para cancelar esta inscrição"
        )
        
    # 4. Verifica se já existe um check-in (regra de negócio)
    # Não podemos cancelar uma inscrição se o usuário já compareceu
    db_presenca = db.query(models.Presenca).filter(
        models.Presenca.inscricao_id == inscricao_id
    ).first()
    
    if db_presenca:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível cancelar: esta inscrição já possui um check-in."
        )

    # 5. Tudo certo, pode deletar
    db.delete(db_inscricao)
    db.commit()
    
    payload = {
        "tipo": "cancelamento",
        "destinatario": current_user.email,
        "nome": current_user.full_name or current_user.username,
        "nome_evento": "Nome do Evento" # TODO: Buscar o nome do evento
    }
    background_tasks.add_task(send_notification, payload)

    return {"message": "Inscrição cancelada com sucesso"}

@app.get("/inscricoes/{id}", response_model=schemas.Inscricao)
def read_inscricao(
    id: int,
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Consulta os detalhes de uma inscrição específica.
    Esta rota é PROTEGIDA.
    """
    
    # 1. Encontra a inscrição no banco de dados
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == id
    ).first()

    # 2. Verifica se a inscrição existe
    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 3. VERIFICAÇÃO DE SEGURANÇA CRÍTICA:
    # O usuário logado (do token) é o dono desta inscrição?
    if db_inscricao.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para visualizar esta inscrição"
        )
        
    # 4. Tudo certo, retorna a inscrição
    return db_inscricao

@app.get("/inscricoes/me", response_model=List[schemas.InscricaoComDetalhes])
def read_minhas_inscricoes(
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Consulta todas as inscrições do usuário logado.
    """
    
    # Esta é a consulta profissional:
    # 1. Filtra por 'usuario_id' (do token)
    # 2. Usa 'options(joinedload(models.Inscricao.evento))' 
    #    para fazer o JOIN e carregar os dados do evento
    #    junto com a inscrição (evita N+1 queries).
    inscricoes = db.query(models.Inscricao).options(
        joinedload(models.Inscricao.evento)
    ).filter(
        models.Inscricao.usuario_id == current_user.id
    ).all()
    
    return inscricoes

@app.get("/presencas/me", response_model=List[schemas.Presenca])
def read_minhas_presencas(
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Consulta todos os registos de presença do usuário logado.
    """
    presencas = db.query(models.Presenca).filter(
        models.Presenca.usuario_id == current_user.id
    ).all()
    
    return presencas

@app.get("/inscricoes/all", response_model=List[schemas.Inscricao]) # <-- MUDANÇA 1: Mude para 'Inscricao'
def read_all_inscricoes(
    db: Session = Depends(get_db),
    admin_user: security.User = Depends(security.get_current_admin_user)
):
    """
    Consulta TODAS as inscrições de todos os usuários.
    Acesso restrito a administradores (atendentes).
    """
    
    inscricoes = db.query(models.Inscricao).options(
        joinedload(models.Inscricao.evento),
        joinedload(models.Inscricao.usuario)
    ).all()
    
    return inscricoes

@app.post("/admin/inscricoes", response_model=schemas.Inscricao, status_code=status.HTTP_201_CREATED, tags=["Admin"])
def admin_create_inscricao(
    inscricao: schemas.AdminInscricaoCreate, # Novo DTO necessário
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: security.User = Depends(security.get_current_admin_user),
):
    """
    (Admin) Registra uma inscrição para um usuário específico.
    Usado pelo App Local (offline) para sincronização.
    """
    
    # 1. Verifica se o evento existe
    evento = db.query(models.Evento).filter(models.Evento.id == inscricao.evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    # 2. Verifica se o usuário existe
    usuario = db.query(models.User).filter(models.User.id == inscricao.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário alvo não encontrado")
        
    # 3. Verifica se a inscrição já existe (Idempotência)
    inscricao_existente = db.query(models.Inscricao).filter(
        models.Inscricao.evento_id == inscricao.evento_id,
        models.Inscricao.usuario_id == inscricao.usuario_id
    ).first()
    
    if inscricao_existente:
        return inscricao_existente

    # 4. Cria a inscrição para o usuário-alvo
    db_inscricao = models.Inscricao(
        evento_id=inscricao.evento_id,
        usuario_id=usuario.id,
        usuario_username=usuario.username
    )
    db.add(db_inscricao)
    db.commit()
    db.refresh(db_inscricao)
    
    # (Notificação para o usuário-alvo, não para o admin)
    payload = {
        "tipo": "inscricao",
        "destinatario": usuario.email,
        "nome": usuario.full_name or usuario.username,
        "nome_evento": evento.nome
    }
    background_tasks.add_task(send_notification, payload)
    
    return db_inscricao