# servico_certificados/src/models.py
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Certificado(Base):
    __tablename__ = "certificados"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Rastreia quem emitiu e para qual evento
    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(Integer, nullable=False, index=True)
    
    # [cite_start]O código único de autenticação [cite: 18]
    codigo_autenticacao = Column(
        String, 
        unique=True, 
        index=True, 
        nullable=False, 
        default=lambda: str(uuid.uuid4()) # Gera um UUID único
    )
    
    data_emissao = Column(DateTime(timezone=True), server_default=func.now())
    
    # Denormalização: Armazena os nomes para fácil geração de PDF
    nome_usuario = Column(String, nullable=False)
    nome_evento = Column(String, nullable=False)

# Tabela de Presença (usada para verificação, não gerenciada por este serviço)
# O SQLAlchemy criará esta tabela se ela não existir, mas o servico_eventos
# já a gere, por isso eles partilharão a definição.
class Presenca(Base):
    __tablename__ = "presencas"
    id = Column(Integer, primary_key=True, index=True)
    inscricao_id = Column(Integer, nullable=False, unique=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(Integer, nullable=False, index=True)
    data_checkin = Column(DateTime(timezone=True), server_default=func.now())