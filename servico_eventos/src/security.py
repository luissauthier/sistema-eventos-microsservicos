# servico_eventos/src/security.py
import os
import httpx  # Importe o httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import Optional

# Endereço interno do serviço de usuários no Docker
USER_SERVICE_URL = "http://servico_usuarios:8000/usuarios/me"

# Esta rota '/auth' é fictícia, apenas para o Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")

# --- Novo Schema ---
# Precisamos de um schema para validar a resposta 
# que esperamos do servico_usuarios
class User(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

# --- Dependência Principal ---

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependência que valida o token fazendo uma chamada interna
    ao servico_usuarios e retorna o objeto User completo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    headers = {"Authorization": f"Bearer {token}"}
    
    # Usamos um cliente HTTP assíncrono
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_URL, headers=headers)
            
            # Se o servico_usuarios retornar 401, repassamos o erro
            if response.status_code == 401:
                raise credentials_exception
            
            response.raise_for_status() # Levanta erro para 500, 404, etc.
            
            # Converte a resposta JSON no nosso Pydantic model
            user = User(**response.json())
            return user

        except (httpx.RequestError, httpx.HTTPStatusError):
            # Erro de conexão ou erro inesperado do servico_usuarios
            raise credentials_exception
        

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """
    Dependência que re-utiliza get_current_user e verifica o flag 'is_admin'.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    return current_user