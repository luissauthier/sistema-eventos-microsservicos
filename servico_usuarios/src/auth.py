# servico_usuarios/src/auth.py

import os
from datetime import datetime, timedelta
from typing import Optional, List

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
import models

# ============================================================
#  CONFIGURAÇÃO DO HASH DE SENHAS
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha usando bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera hash seguro de senha."""
    return pwd_context.hash(password)


# ============================================================
#  CONFIGURAÇÃO DO JWT (CORPORATIVO)
# ============================================================

SECRET_KEY = os.getenv("JWT_SECRET", "nexstage_online_event_management_system")
ALGORITHM = "HS256"
ISSUER = "sistema-eventos"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")
def create_access_token(
    sub: str, 
    roles: Optional[List[str]] = None, 
    expires_minutes: int = None,
    extra_claims: dict = None 
):
    """
    Cria token JWT profissional com:
    - sub: identificação do usuário
    - roles: lista de permissões
    - extra_claims: dados adicionais (email, id, etc)
    """
    now = datetime.utcnow()
    exp = now + timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": sub,
        "roles": roles or ["user"],
        "iss": ISSUER,
        "iat": now.timestamp(),
        "exp": exp.timestamp(),
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ============================================================
#  VALIDAÇÃO DO TOKEN E OBTENÇÃO DO USUÁRIO
# ============================================================

def decode_and_validate_token(token: str):
    valid_issuers = [
        "servico-eventos",
        "sistema-eventos",
        "servico-usuarios",
    ]

    for issuer in valid_issuers:
        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
                issuer=issuer
            )
            return payload
        except JWTError:
            continue

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou emissor desconhecido.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_and_validate_token(token)

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: 'sub' ausente."
        )

    user = (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas: usuário não encontrado."
        )

    try:
        request.state.user = {
            "id": user.id,
            "username": user.username,
            "roles": payload.get("roles") or [],
        }
    except Exception:
        pass

    return user


# ============================================================
#  PERMISSÕES (RBAC PROFISSIONAL)
# ============================================================

def require_roles(*allowed_roles):
    async def role_checker(
        request: Request,
        current_user: models.User = Depends(get_current_user)
    ):
        roles = request.state.user.get("roles", [])

        if not any(role in roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissões insuficientes"
            )

        return current_user

    return role_checker


def get_current_admin_user(
    user: models.User = Depends(require_roles("admin"))
):
    return user