from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# --- Token (JWT) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Usuário ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

# Modelo para criação de usuário (o que a API recebe em POST /usuarios)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)

# Modelo para ler dados do usuário (o que a API retorna)
class User(UserBase):
    id: int
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
