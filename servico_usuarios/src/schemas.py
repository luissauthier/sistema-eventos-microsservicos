# servico_usuarios/src/schemas.py

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


# ============================================================
#  TOKEN / AUTENTICAÇÃO
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: Optional[str] = None
    roles: Optional[list[str]] = None


# ============================================================
#  USUÁRIOS – VALIDAÇÕES E BASES
# ============================================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None

    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = Field(None, max_length=255)

    must_change_password: bool = False
    is_active: bool = True
    is_verified: bool = False
    # --------------------

    # --- Sanitização padrão ---
    @field_validator("username", "full_name", "email", "cpf", "telefone", "endereco", mode="before")
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v


# ============================================================
#  CRIAÇÃO DE USUÁRIO
# ============================================================

class UserCreate(UserBase):
    """
    Modelo de criação de usuários.
    """

    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("password")
    def validate_password_strength(cls, v):
        if v.isdigit():
            raise ValueError("A senha não pode conter apenas números.")
        if len(set(v)) < 3:
            raise ValueError("A senha é muito simples.")
        return v


# ============================================================
#  MODELO PÚBLICO DO USUÁRIO
# ============================================================

class User(BaseModel):
    """
    Resposta padrão pública para dados de usuário.
    Internamente pode ter mais campos, mas aqui mostramos apenas os não sensíveis.
    """

    id: int
    username: str
    full_name: Optional[str]
    email: Optional[EmailStr]
    cpf: Optional[str]
    telefone: Optional[str]
    endereco: Optional[str]
    is_active: bool
    is_verified: bool
    must_change_password: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
#  MODELO ADMIN (INTERNO)
# ============================================================

class UserAdmin(User):
    """Retorno expandido para administradores."""
    is_admin: bool
    is_superuser: bool

    class Config:
        from_attributes = True


# ============================================================
#  ATUALIZAÇÃO DO USUÁRIO (PATCH)
# ============================================================

class UserUpdate(BaseModel):
    password: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None

    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = Field(None, max_length=255)

    must_change_password: Optional[bool] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

    @field_validator("full_name", "email", "cpf", "telefone", "endereco", mode="before")
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    class Config:
        extra = "forbid"