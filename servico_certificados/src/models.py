# servico_certificados/src/models.py
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base

class CertificadoMetadata(Base):
    __tablename__ = "certificados_metadata"

    id = Column(Integer, primary_key=True, index=True)
    codigo_unico = Column(String(64), unique=True, index=True, nullable=False)
    
    participante_nome = Column(String(200), nullable=False)
    evento_nome = Column(String(200), nullable=False)
    evento_data = Column(String(50), nullable=False)

    template_nome = Column(String(50), default="default", nullable=False) 
    
    dados_extras = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())