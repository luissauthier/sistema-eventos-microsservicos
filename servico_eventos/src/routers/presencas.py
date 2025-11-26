# servico_eventos/src/routers/presencas.py
from fastapi import APIRouter, Depends, BackgroundTasks, status, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import os
import models, schemas
from database import get_db
from security import get_current_admin_user, get_current_user, User
from services.integracao import (
    solicitar_emissao_certificado_automatica, 
    send_notification_guaranteed,
    fetch_user_data,
    emitir_certificado_sincrono
)
from servico_comum import logger
from servico_comum.exceptions import ServiceError
from servico_comum.responses import success

router = APIRouter(tags=["Presenças & Check-in"])

# --- LOGICA DE CHECK-IN COMUM ---
async def realizar_checkin_logica(insc, origem, background, db):
    """Função reutilizável para registrar presença."""
    presenca = models.Presenca(
        inscricao_id=insc.id,
        usuario_id=insc.usuario_id,
        evento_id=insc.evento_id,
        origem=origem
    )
    db.add(presenca)
    db.commit()
    db.refresh(presenca)

    # Buscar dados frescos para certificado/email
    try:
        user_data = await fetch_user_data(insc.usuario_id)
        user_email = user_data.get("email")
        evento = insc.evento  # Assumindo carregado ou lazy loading
        user_nome = user_data.get("full_name") or user_data.get("username") or "Participante"
        
        # Tarefa 1: Emitir Certificado
        cert_data = await emitir_certificado_sincrono(insc, user_email, evento)
        
        if cert_data and cert_data.get("codigo_unico"):
            # SALVA NO BANCO LOCAL DO SERVIÇO DE EVENTOS
            # Verifica se já existe para evitar duplicidade
            if not db.query(models.Certificado).filter_by(inscricao_id=insc.id).first():
                novo_cert = models.Certificado(
                    inscricao_id=insc.id,
                    evento_id=insc.evento_id,
                    codigo_unico=cert_data["codigo_unico"]
                )
                db.add(novo_cert)
                db.commit()
                db.refresh(novo_cert)

        background.add_task(send_notification_guaranteed, {
            "tipo": "checkin",
            "destinatario": user_email,
            "nome": user_nome,
            "nome_evento": evento.nome
        })
    except Exception as e:
        logger.error(f"Erro no fluxo pós-checkin: {e}")

    return presenca

# --- ENDPOINTS ---

@router.post("/admin/presencas/checkin", response_model=schemas.Presenca, status_code=201, tags=["Admin"])
async def registrar_presenca_admin(
    body: schemas.PresencaCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    insc = db.query(models.Inscricao).filter_by(id=body.inscricao_id).first()
    if not insc:
        raise ServiceError("Inscrição não encontrada", 404)
    
    existente = db.query(models.Presenca).filter_by(inscricao_id=insc.id).first()
    if existente: return existente

    return await realizar_checkin_logica(insc, body.origem, background, db)

@router.post("/checkin-qr/{token_uuid}", response_model=schemas.CheckinQRCodeResult)
async def consume_checkin_qr(
    token_uuid: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Valida Token
    token_obj = db.query(models.CheckinToken).filter_by(token=token_uuid).first()
    now_utc = datetime.now(timezone.utc)
    if not token_obj or not token_obj.is_active or token_obj.data_expiracao < now_utc:
        raise ServiceError("Token inválido ou expirado", 400)

    # Auto-Inscrição (Inscrição Rápida)
    insc = db.query(models.Inscricao).filter_by(usuario_id=user.id, evento_id=token_obj.evento_id).first()
    if not insc:
        # Cria inscrição na hora
        insc = models.Inscricao(
            evento_id=token_obj.evento_id,
            usuario_id=user.id,
            usuario_username=user.username,
            status=models.InscricaoStatus.ATIVA.value
        )
        db.add(insc)
        db.commit()
        db.refresh(insc)
    if insc.status == models.InscricaoStatus.CANCELADA.value:
        raise ServiceError("Sua inscrição está cancelada. Reative-a no portal antes de fazer check-in.", 400)
    
    # Verifica Presença
    if db.query(models.Presenca).filter_by(inscricao_id=insc.id).first():
        return {"message": "Já registrado", "inscricao_id": insc.id, "presenca_registrada": True}

    # Registra Presença
    await realizar_checkin_logica(insc, models.PresencaOrigem.QR_CODE.value, background, db)
    
    # Invalida token (se for uso único) - opcional, aqui mantemos ativo para outros usuarios usarem o mesmo QR do evento
    # db.query(models.CheckinToken).filter_by(token=token_uuid).update({"is_active": False}) 
    # NOTA: Geralmente QR de evento é publico para todos, então não invalidamos.

    return {"message": "Sucesso", "inscricao_id": insc.id, "presenca_registrada": True}

@router.post("/admin/sync/presencas", tags=["Admin", "Sync"])
async def sync_presencas_offline(
    payload: schemas.SyncPayload,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Recebe lista de presenças capturadas offline e processa em lote."""
    results = []
    for item in payload.presencas:
        insc = db.query(models.Inscricao).filter_by(id=item.inscricao_id).first()

        if not insc:
            continue 

        if not db.query(models.Presenca).filter_by(inscricao_id=insc.id).first():
            presenca = models.Presenca(
                inscricao_id=insc.id,
                usuario_id=insc.usuario_id,
                evento_id=insc.evento_id,
                origem=models.PresencaOrigem.SINCRONIZADO.value,
                data_checkin=item.data_checkin
            )
            db.add(presenca)
            db.commit()
            results.append(presenca.id)
            
            evento = insc.evento
            cert_data = await emitir_certificado_sincrono(insc, "usuario@sistema.com", evento)
            
            if cert_data and cert_data.get("codigo_unico"):
                 if not db.query(models.Certificado).filter_by(inscricao_id=insc.id).first():
                    novo_cert = models.Certificado(
                        inscricao_id=insc.id,
                        evento_id=insc.evento_id,
                        codigo_unico=cert_data["codigo_unico"]
                    )
                    db.add(novo_cert)
                    db.commit()

    return success({"sincronizadas": len(results), "ids": results})

@router.post("/admin/checkin/generate", response_model=schemas.CheckinTokenResponse, tags=["Admin"])
def generate_checkin_token(
    body: schemas.CheckinTokenCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Gera um token temporário para Auto-Check-in via QR Code.
    """
    evento = db.query(models.Evento).filter_by(id=body.evento_id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    #Invalida tokens anteriores deste evento
    db.query(models.CheckinToken).filter_by(evento_id=body.evento_id).update({"is_active": False})
    
    token_uuid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=body.duracao_minutos)

    token = models.CheckinToken(
        token=token_uuid,
        evento_id=body.evento_id,
        data_expiracao=exp,
        is_active=True
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if base_url.endswith("/"):
        base_url = base_url[:-1]

    return {
        "token": token.token,
        "evento_id": token.evento_id,
        "data_expiracao": token.data_expiracao,
        "is_active": token.is_active,
        "url_publica": f"{base_url}/checkin?token={token.token}"
    }

@router.delete("/admin/presencas/{id}", tags=["Admin"])
def deletar_presenca_admin(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Remove uma presença (Correção de erro operacional)."""
    presenca = db.query(models.Presenca).filter_by(id=id).first()
    if not presenca:
        # Se já não existe, retorna 200 para o sync não travar
        return success("Presença já removida ou inexistente.")
    
    db.delete(presenca)
    db.commit()
    return success("Presença removida com sucesso.")
