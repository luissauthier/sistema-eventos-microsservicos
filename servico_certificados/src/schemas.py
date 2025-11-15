# servico_certificados/src/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# --- Schema do Usuário (vindo do token) ---
# Usado pelo security.py
class User(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_admin: bool

# --- Certificado ---
class CertificadoCreate(BaseModel):
    evento_id: int
    # O usuario_id virá do token
    
    # Precisamos dos nomes para o certificado
    nome_evento: str
    # O nome do usuário virá do token (current_user.full_name)


class Certificado(BaseModel):
    id: int
    usuario_id: int
    evento_id: int
    codigo_autenticacao: str
    data_emissao: datetime
    nome_usuario: str
    nome_evento: str

    class Config:
        from_attributes = True