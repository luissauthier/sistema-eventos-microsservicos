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
from typing import Optional, List
from servico_comum.auth import decode_token
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
    roles: List[str] = []
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
    Valida o token LOCALMENTE (Stateless).
    Baixo acoplamento: Não depende do servico_usuarios estar online.
    """
    try:
        # 1. Decodifica e Valida Assinatura (usa servico_comum)
        payload = decode_token(token)
        
        # 2. Extrai dados do payload (Claims)
        user_id = payload.get("user_id")
        username = payload.get("sub")
        roles = payload.get("roles", [])
        
        if not username or not user_id:
            raise HTTPException(status_code=401, detail="Token malformado")

        # 3. Reconstrói o objeto User
        user = User(
            id=user_id,
            username=username,
            email=payload.get("email"),       # Vem do token
            full_name=payload.get("full_name"), # Vem do token
            roles=roles,
            is_admin="admin" in roles
        )

        # Injeta ID da requisição se disponível (para rastreabilidade)
        request.state.user = user
        return user

    except Exception as e:
        logger.warning(f"auth_failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
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
