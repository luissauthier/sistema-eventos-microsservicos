# servico_certificados/src/security.py
import os
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr # Importe EmailStr
from typing import Optional

# Endereço interno do serviço de usuários no Docker
USER_SERVICE_URL = "http://servico_usuarios:8000/usuarios/me"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth")

# Schema do usuário que esperamos de volta
class User(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_admin: bool

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(USER_SERVICE_URL, headers=headers)
            if response.status_code == 401:
                raise credentials_exception
            response.raise_for_status()
            user = User(**response.json())
            return user
        except (httpx.RequestError, httpx.HTTPStatusError):
            raise credentials_exception