# servico_eventos/src/security.py

"""
Módulo responsável por autenticação e autorização no serviço de eventos.
Se o token for válido, este serviço recebe os dados do usuário já autenticado.
"""

import os
import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import Optional

from servico_comum.logger import configure_logger


# ============================================================
#  LOGGER CORPORATIVO
# ============================================================

logger = configure_logger("servico_eventos.security")


# ============================================================
#  CONFIGURAÇÃO DO ENDPOINT DE VALIDAÇÃO NO SERVICO_USUARIOS
# ============================================================

USER_SERVICE_URL = os.getenv(
    "USER_SERVICE_URL",
    "http://servico_usuarios:8000/usuarios/me"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")


# ============================================================
#  SCHEMA CORPORATIVO DO USUÁRIO
# ============================================================

class User(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    is_verified: bool = False


# ============================================================
#  AUTH – PRINCIPAL DEPENDENCY
# ============================================================

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme)
):
    """
    Encaminha o token ao servico_usuarios.
    Caso o usuário seja válido, devolve o User corporativo.
    """

    # Headers seguros
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Request-ID": getattr(request.state, "request_id", None)
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(USER_SERVICE_URL, headers=headers)

        if response.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Levanta exceções para 404, 500, etc.
        response.raise_for_status()

        data = response.json()

        # Converte para schema corporativo
        user = User(**data)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta inativa"
            )

        return user

    except httpx.TimeoutException:
        logger.error("Timeout ao contatar servico_usuarios")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="serviço de autenticação indisponível"
        )

    except httpx.RequestError as exc:
        logger.error("Erro de rede ao chamar servico_usuarios", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="serviço de autenticação indisponível"
        )


# ============================================================
#  RBAC
# ============================================================

def get_current_admin_user(user: User = Depends(get_current_user)):
    """
    Verifica se o usuário autenticado possui papel de admin.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    return user
