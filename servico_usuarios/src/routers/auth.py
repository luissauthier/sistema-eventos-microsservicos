# servico_usuarios/src/routers/auth.py
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas 
import auth as auth_service
from database import get_db
from servico_comum.exceptions import ServiceError
from servico_comum.logger import configure_logger

router = APIRouter(tags=["Autenticação"])
logger = configure_logger("router_auth")

@router.post("/auth", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Autenticação: Recebe username/password e retorna JWT.
    """
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        # Log de segurança (falha de login)
        logger.warning("login_failed", extra={"username": form_data.username})
        raise ServiceError("Credenciais inválidas", 401)

    # Gera o token com roles
    roles = ["admin"] if user.is_admin else ["user"]
    token = auth_service.create_access_token(
        sub=user.username,
        roles=roles,
        extra_claims={
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    )

    logger.info("login_success", extra={"username": user.username, "roles": roles})

    return {"access_token": token, "token_type": "bearer"}