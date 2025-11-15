# servico_usuarios/src/auth.py
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models # Nossos modelos do DB
import schemas # Nossos schemas Pydantic

# --- Configuração de Hashing de Senha ---
# Usamos bcrypt, o padrão de mercado.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# --- Configuração do JWT ---
# Carrega os segredos do .env
SECRET_KEY = os.environ['JWT_SECRET']
ALGORITHM = os.environ['JWT_ALGORITHM']
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'])

# Esquema de autenticação que o FastAPI usará
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth") # /auth é nosso endpoint de login

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """
    Decodifica o token, extrai o username (sub) e busca o 
    usuário completo no banco de dados.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        # O token é válido, agora buscamos o usuário no DB
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            # Caso raro: token é válido mas o usuário foi deletado
            raise credentials_exception
        
        return user # Retorna o objeto models.User completo
        
    except JWTError:
        raise credentials_exception
    
def get_current_admin_user(
    current_user: models.User = Depends(get_current_user)
):
    """
    Dependência que usa a 'get_current_user' e, em seguida,
    verifica se esse usuário tem o flag 'is_admin'.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    return current_user