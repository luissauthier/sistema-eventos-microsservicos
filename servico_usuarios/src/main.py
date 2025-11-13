# servico_usuarios/src/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

# Importa nossos módulos locais
import models
import schemas
import auth
from database import engine, get_db

# Isso cria as tabelas no DB (ex: a tabela "usuarios") se elas não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Serviço de Usuários",
    description="API para gerenciamento de usuários e autenticação",
    version="1.0.0"
)

# --- Endpoint de Cadastro  ---
@app.post("/usuarios", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verifica se o usuário já existe
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário já cadastrado"
        )
    
    # Risco de Segurança: Hashing de Senha é OBRIGATÓRIO
    # Nunca salve a senha direto!
    hashed_password = auth.get_password_hash(user.password)
    
    # Cria o novo usuário no DB
    db_user = models.User(
        username=user.username, 
        hashed_password=hashed_password,
        email=user.email,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Endpoint de Login (Autenticação)  ---
@app.post("/auth", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Busca o usuário no DB
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    # 2. Verifica se o usuário existe E se a senha está correta
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Cria o Token JWT
    access_token = auth.create_access_token(
        data={"sub": user.username} # "sub" (subject) é o padrão para o nome do usuário no JWT
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/usuarios/me", response_model=schemas.User)
def read_users_me(
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retorna os dados do usuário atualmente logado (identificado pelo token).
    """
    # A dependência 'auth.get_current_user' faz todo o trabalho.
    # Se o código chegar aqui, 'current_user' é o objeto User válido.
    return current_user