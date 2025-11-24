# servico_usuarios/src/routers/usuarios.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

import models   
import schemas
from schemas import HeartbeatSchema
import auth as auth_service 
from database import get_db 
from servico_comum.exceptions import ServiceError
# Renomeamos para 'get_token_payload' para deixar claro que retorna apenas dados do token
from servico_comum.auth import require_roles, get_current_user as get_token_payload
from servico_comum.logger import configure_logger

router = APIRouter(tags=["Usuários"])
logger = configure_logger("router_usuarios")

# --- DEPENDÊNCIA LOCAL DE RESOLUÇÃO DE USUÁRIO ---
def get_current_user_from_db(
    payload: dict = Depends(get_token_payload), 
    db: Session = Depends(get_db)
) -> models.User:
    """
    Recupera o objeto User completo do banco de dados baseado no token JWT.
    """
    username = payload.get("sub")
    if not username:
         raise ServiceError("Token inválido: sub não encontrado", 401)

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise ServiceError("Usuário não encontrado", 404)
    
    return user

# --- PÚBLICO ---

@router.post("/usuarios", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Cadastro de novos usuários (Self-Service)."""
    
    # 1. Validações de unicidade
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise ServiceError("Usuário já cadastrado", 400)
    
    if user.cpf and db.query(models.User).filter(models.User.cpf == user.cpf).first():
        raise ServiceError("CPF já cadastrado", 400)

    if user.email and db.query(models.User).filter(models.User.email == user.email).first():
        raise ServiceError("E-mail já cadastrado", 400)

    # 2. Criação
    hashed_password = auth_service.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        email=user.email,
        full_name=user.full_name,
        cpf=user.cpf,
        telefone=user.telefone,
        endereco=user.endereco,
        must_change_password=user.must_change_password,
        is_admin=False,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info("user_created", extra={"username": new_user.username})
    return new_user

# --- AUTENTICADO (ME) ---

@router.get("/usuarios/me", response_model=schemas.UserAdmin)
def read_me(current_user: models.User = Depends(get_current_user_from_db)):
    """
    Perfil do usuário logado.
    A Rota deve ser EXPLICITAMENTE /usuarios/me para casar com o Nginx.
    """
    return current_user

@router.patch("/usuarios/me", response_model=schemas.User)
def update_me(
    update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_from_db)
):
    """Atualização de dados cadastrais do próprio usuário."""
    data = update.model_dump(exclude_unset=True)

    # Valida troca de email
    if "email" in data:
        exists = db.query(models.User).filter(
            models.User.email == data["email"], 
            models.User.id != current_user.id
        ).first()
        if exists:
            raise ServiceError("Este e-mail já está em uso", 400)
        
    if "password" in data:
        # Se enviou senha nova, faz o hash antes de salvar
        password_plain = data.pop("password")
        current_user.hashed_password = auth_service.get_password_hash(password_plain)
        
        # Se trocou a senha, assume que cumpriu a obrigação (se existia)
        if current_user.must_change_password:
            current_user.must_change_password = False
    
    # Se enviou explicitamente a flag (ex: admin setando), usa o valor
    if "must_change_password" in data:
        current_user.must_change_password = data["must_change_password"]

    for field, value in data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user

# --- ADMIN / INTERNO ---

@router.get("/usuarios", response_model=List[schemas.UserAdmin], tags=["Admin"])
def list_users(
    db: Session = Depends(get_db),
    _ = Depends(require_roles("admin"))
):
    return db.query(models.User).all()

@router.get("/usuarios/{id}", response_model=schemas.UserAdmin, tags=["Interno"])
def get_user_by_id(
    id: int,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise ServiceError("Usuário não encontrado", 404)
    return user

@router.post("/usuarios/heartbeat", status_code=204)
def registrar_batimento(
    payload: HeartbeatSchema,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_from_db)
):
    """
    Recebe: { "status": "online" } ou { "status": "working_offline" }
    """
    current_user.last_heartbeat = datetime.now(timezone.utc)
    current_user.connection_status = payload.status
    db.commit()
    return