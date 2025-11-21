# servico_eventos/src/routers/eventos.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

import models, schemas
from database import get_db
from security import get_current_admin_user, User
from servico_comum.exceptions import ServiceError
from servico_comum.logger import configure_logger

router = APIRouter(tags=["Eventos"])
logger = configure_logger("router_eventos")

@router.get("/eventos", response_model=List[schemas.Evento])
def list_eventos(db: Session = Depends(get_db)):
    return db.query(models.Evento).all()

@router.get("/eventos/{id}", response_model=schemas.Evento)
def get_evento(id: int, db: Session = Depends(get_db)):
    evento = db.query(models.Evento).filter_by(id=id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)
    return evento

@router.post("/admin/eventos", response_model=schemas.Evento, status_code=201, tags=["Admin"])
def create_evento(
    data: schemas.EventoCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    evento = models.Evento(**data.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)
    logger.info("evento_created", extra={"evento_id": evento.id})
    return evento

@router.patch("/admin/eventos/{id}", response_model=schemas.Evento, tags=["Admin"])
def update_evento(
    id: int,
    update_data: schemas.EventoUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    evento = db.query(models.Evento).filter_by(id=id).first()
    if not evento:
        raise ServiceError("Evento não encontrado", 404)

    dados = update_data.model_dump(exclude_unset=True)
    for key, value in dados.items():
        setattr(evento, key, value)

    evento.updated_at = datetime.utcnow()
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento