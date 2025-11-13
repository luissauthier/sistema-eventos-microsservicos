# servico_eventos/src/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base

class Evento(Base):
    __tablename__ = "eventos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String)
    data_evento = Column(DateTime(timezone=True))

class Inscricao(Base):
    __tablename__ = "inscricoes"
    id = Column(Integer, primary_key=True, index=True)
    # Assume que o ID do usuário vem do token JWT
    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(ForeignKey("eventos.id"), nullable=False, index=True)
    data_inscricao = Column(DateTime(timezone=True), server_default=func.now())
    # O 'usuario_username' é útil para joins rápidos, mas opcional
    usuario_username = Column(String, index=True) 

class Presenca(Base):
    __tablename__ = "presencas"
    id = Column(Integer, primary_key=True, index=True)
    inscricao_id = Column(ForeignKey("inscricoes.id"), nullable=False, unique=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(Integer, nullable=False, index=True)
    data_checkin = Column(DateTime(timezone=True), server_default=func.now())