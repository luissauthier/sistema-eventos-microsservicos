# servico_eventos/src/routers/inscricoes.py
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List
from datetime import datetime

import models, schemas
from database import get_db
from security import get_current_user, User, get_current_admin_user 
from services.integracao import send_notification_guaranteed, fetch_user_data, emitir_certificado_sincrono
from servico_comum.exceptions import ServiceError
from servico_comum.responses import success

router = APIRouter(tags=["Inscrições"])

# --- ROTAS DO USUÁRIO (Mantidas) ---
@router.post("/inscricoes", response_model=schemas.Inscricao, status_code=201)
def create_inscricao(
    body: schemas.InscricaoCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    evento = db.query(models.Evento).filter_by(id=body.evento_id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    existente = db.query(models.Inscricao).filter_by(usuario_id=user.id, evento_id=body.evento_id).first()
    if existente:
        if existente.status == models.InscricaoStatus.CANCELADA.value:
            existente.status = models.InscricaoStatus.ATIVA.value
            existente.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existente)
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

@router.get("/inscricoes/me", response_model=List[schemas.InscricaoDetalhes])
async def minhas_inscricoes(  # <--- Agora é ASYNC
    db: Session = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    """
    Lista inscrições e faz AUTO-REPARO se faltar certificado.
    """
    inscricoes = db.query(models.Inscricao).options(
        joinedload(models.Inscricao.evento),
        selectinload(models.Inscricao.presencas),
        joinedload(models.Inscricao.certificado)
    ).filter_by(usuario_id=user.id).all()

    # Lógica de Auto-Reparo (Self-Healing)
    for insc in inscricoes:
        # Se tem presença MAS não tem certificado salvo
        if insc.checkin_realizado and not insc.certificado:
            print(f"[AUTO-REPAIR] Gerando certificado faltante para inscrição {insc.id}")
            
            # Tenta obter email do objeto user do token ou usa fallback
            user_email = getattr(user, "email", None) or "usuario@evento.com"
            
            # Gera agora
            cert_data = await emitir_certificado_sincrono(insc, user_email, insc.evento)
            
            if cert_data and cert_data.get("codigo_unico"):
                # Salva no banco
                novo_cert = models.Certificado(
                    inscricao_id=insc.id,
                    evento_id=insc.evento_id,
                    codigo_unico=cert_data["codigo_unico"]
                )
                db.add(novo_cert)
                db.commit()
                # Atualiza o objeto para retornar na resposta atual
                db.refresh(insc)
                
                if not insc.certificado:
                    insc.certificado = db.query(models.Certificado).filter_by(inscricao_id=insc.id).first()
    
    return inscricoes

@router.patch("/inscricoes/{id}/cancelar")
def cancelar_inscricao(
    id: int,
    body: schemas.InscricaoCancelamento,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    insc = db.query(models.Inscricao).filter_by(id=id).first()
    if not insc or insc.usuario_id != user.id:
        raise ServiceError("Inscrição inválida ou acesso negado", 404)

    if db.query(models.Presenca).filter_by(inscricao_id=id).first():
        raise ServiceError("Não é possível cancelar: presença já registrada", 400)

    insc.status = models.InscricaoStatus.CANCELADA.value
    insc.updated_at = datetime.utcnow()
    db.commit()

    evento_nome = db.query(models.Evento).filter_by(id=insc.evento_id).first().nome
    background.add_task(send_notification_guaranteed, {
        "tipo": "cancelamento",
        "destinatario": user.email,
        "nome": user.full_name,
        "nome_evento": evento_nome
    })
    return success("Inscrição cancelada.")


# --- ROTAS DE ADMIN (SYNC) - CORRIGIDAS ---

@router.get("/admin/inscricoes", response_model=List[schemas.Inscricao], tags=["Admin"])
def listar_todas_inscricoes_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(models.Inscricao).all()

@router.post("/admin/inscricoes", response_model=schemas.Inscricao, status_code=201, tags=["Admin"])
async def admin_create_inscricao(
    body: schemas.InscricaoAdminCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    evento = db.query(models.Evento).filter_by(id=body.evento_id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    # Busca dados do usuário (Mock ou Fetch)
    username = f"user_{body.usuario_id}"
    user_email = None
    user_nome = username
    try:
        user_data = await fetch_user_data(body.usuario_id)
        username = user_data.get("username", username)
        user_email = user_data.get("email")
        user_nome = user_data.get("full_name") or username
    except Exception: pass

    # Lógica de Idempotência e Reativação
    existente = db.query(models.Inscricao).filter_by(
        usuario_id=body.usuario_id,
        evento_id=body.evento_id
    ).first()

    if existente:
        # CORREÇÃO: Se estiver cancelada, reativa!
        if existente.status == models.InscricaoStatus.CANCELADA.value:
            existente.status = models.InscricaoStatus.ATIVA.value
            existente.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existente)
            
            # Envia e-mail de re-inscrição
            if user_email:
                background.add_task(send_notification_guaranteed, {
                    "tipo": "inscricao",
                    "destinatario": user_email,
                    "nome": user_nome,
                    "nome_evento": evento.nome
                })
        return existente

    insc = models.Inscricao(
        evento_id=body.evento_id,
        usuario_id=body.usuario_id,
        usuario_username=username
    )
    db.add(insc)
    db.commit()
    db.refresh(insc)

    if user_email:
        background.add_task(send_notification_guaranteed, {
            "tipo": "inscricao",
            "destinatario": user_email,
            "nome": user_nome,
            "nome_evento": evento.nome
        })

    return insc