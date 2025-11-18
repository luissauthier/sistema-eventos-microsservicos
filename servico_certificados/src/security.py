# servico_certificados/src/security.py

"""
Módulo de segurança profissional para o serviço de certificados.
"""

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import Optional

from servico_comum.logger import configure_logger


# ============================================================
#  LOGGER
# ============================================================

logger = configure_logger("servico_certificados.security")


# ============================================================
#  CONFIGURAÇÃO
# ============================================================

USER_SERVICE_URL = "http://servico_usuarios:8000/usuarios/me"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")


# ============================================================
#  MODELO DO USUÁRIO VIA API
# ============================================================

class User(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_admin: bool


# ============================================================
#  MIDDLEWARE DE AUTENTICAÇÃO
# ============================================================

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Valida o token JWT chamando o serviço de usuários.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não informado."
        )

    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(USER_SERVICE_URL, headers=headers)

            if response.status_code == 401:
                logger.warning("token_invalid_or_expired")
                raise HTTPException(
                    status_code=401,
                    detail="Token inválido ou expirado."
                )

            response.raise_for_status()
            user = User(**response.json())
            return user

    except httpx.TimeoutException:
        logger.error("usuario_service_timeout")
        raise HTTPException(
            status_code=503,
            detail="Serviço de usuários indisponível (timeout)."
        )

    except httpx.RequestError as e:
        logger.error("usuario_service_connection_error", extra={"error": str(e)})
        raise HTTPException(
            status_code=503,
            detail="Falha ao conectar ao serviço de usuários."
        )


# ============================================================
#  CONTROLE DE ACESSO — ADMIN
# ============================================================

async def get_current_admin_user(user: User = Depends(get_current_user)) -> User:
    """
    Garante que o usuário autenticado é administrador.
    """
    if not user.is_admin:
        logger.warning("admin_required", extra={"user": user.username})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores."
        )
    return user