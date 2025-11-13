# servico_usuarios/src/models.py
from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    # Nunca armazene a senha em texto plano!
    hashed_password = Column(String, nullable=False)
    # Campos para o "complemento de dados" [cite: 27] (pode adicionar mais)
    full_name = Column(String, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)