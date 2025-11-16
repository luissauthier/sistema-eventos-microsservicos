# servico_usuarios/src/main.py

from fastapi import FastAPI, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import time

# --- Imports corporativos ---
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import (
    ServiceError,
    service_error_handler,
    validation_error_handler
)
from servico_comum.auth import (
    get_current_user,
    create_access_token,
    require_roles
)
from servico_comum.responses import success

# --- Imports locais ---
import models
import schemas
import auth
from database import engine, get_db


# ============================================================
#  INITIALIZATION
# ============================================================

models.Base.metadata.create_all(bind=engine)

logger = configure_logger("servico_usuarios")

app = FastAPI(
    title="Serviço de Usuários",
    description="API para gerenciamento de usuários e autenticação",
    version="1.0.0",
)

app.add_middleware(RequestIDMiddleware)

# Handlers globais
app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)


# ============================================================
#  MIDDLEWARE DE LOG CORPORATIVO
# ============================================================

@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000

    logger.info(
        "request_completed",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status": response.status_code,
            "duration_ms": duration,
            "request_id": getattr(request.state, "request_id", None)
        }
    )
    return response


# ============================================================
#  ENDPOINT: CRIAÇÃO DE USUÁRIO
# ============================================================

@app.post(
    "/usuarios",
    response_model=schemas.User,
    status_code=status.HTTP_201_CREATED,
    tags=["Usuários"]
)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Cadastro seguro de usuários.
    """

    # Verifica username duplicado
    exists = db.query(models.User).filter(models.User.username == user.username).first()
    if exists:
        raise ServiceError("Usuário já cadastrado", 400)

    hashed_password = auth.get_password_hash(user.password)

    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        email=user.email,
        full_name=user.full_name,
        # Flags internas NÃO podem vir do cliente:
        is_admin=False,
        is_superuser=False,
        is_active=True,
        is_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("user_created", extra={"username": new_user.username})

    return new_user


# ============================================================
#  ENDPOINT: LOGIN / TOKEN
# ============================================================

@app.post("/auth", response_model=schemas.Token, tags=["Autenticação"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Autenticação: retorna JWT seguro.
    """

    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise ServiceError("Credenciais inválidas", 401)

    token = create_access_token(
        sub=user.username,
        roles=["admin"] if user.is_admin else ["user"]
    )

    logger.info("login_success", extra={"username": user.username})

    return {"access_token": token, "token_type": "bearer"}


# ============================================================
#  ENDPOINT: PERFIL DO USUÁRIO LOGADO
# ============================================================

@app.get(
    "/usuarios/me",
    response_model=schemas.User,
    tags=["Usuários"]
)
def read_me(current_user: models.User = Depends(get_current_user)):
    """
    Retorna os dados públicos do usuário autenticado.
    """
    return current_user


# ============================================================
#  ENDPOINT: ATUALIZAÇÃO DO PRÓPRIO USUÁRIO
# ============================================================

@app.patch(
    "/usuarios/me",
    response_model=schemas.User,
    tags=["Usuários"]
)
def update_me(
    update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Atualiza os dados do próprio usuário.
    """

    data = update.model_dump(exclude_unset=True)

    if "email" in data:
        exists = (
            db.query(models.User)
            .filter(models.User.email == data["email"], models.User.id != current_user.id)
            .first()
        )
        if exists:
            raise ServiceError("Este e-mail já está em uso", 400)

    for field, value in data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    logger.info("user_updated", extra={"username": current_user.username})

    return current_user


# ============================================================
#  ENDPOINT: LISTA COMPLETA DE USUÁRIOS (ADMIN ONLY)
# ============================================================

@app.get(
    "/usuarios",
    response_model=List[schemas.UserAdmin],
    tags=["Admin"]
)
def list_users(
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin"))
):
    """
    Lista todos os usuários, apenas para administradores.
    """
    return db.query(models.User).all()