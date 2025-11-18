# servico_certificados/src/models.py

"""
Modelagem profissional para o serviço de certificados.
"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID


# ============================================================
#  UTILITÁRIO: GERAÇÃO DE CÓDIGO ÚNICO
# ============================================================

def gerar_codigo_unico():
    return uuid.uuid4()


# ============================================================
#  MODELO PRINCIPAL: CERTIFICADO
# ============================================================

class Certificado(Base):
    __tablename__ = "certificados"

    id = Column(Integer, primary_key=True, index=True)

    # Código de validação público
    codigo_unico = Column(UUID(as_uuid=True), unique=True, index=True, default=gerar_codigo_unico)

    # Data e metadados
    data_emissao = Column(DateTime(timezone=True), server_default=func.now())
    origem_automatica = Column(Boolean, default=True)  # Auto (check-in) ou manual (admin)
    
    # Identificador interno (sem foreign key!)
    inscricao_id = Column(Integer, nullable=False, index=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(Integer, nullable=False, index=True)

    # SNAPSHOT — estes dados nunca mudam após emissão
    usuario_nome = Column(String, nullable=False)
    usuario_email = Column(String, nullable=False)

    evento_nome = Column(String, nullable=False)
    evento_data = Column(DateTime(timezone=True), nullable=True)

    template_certificado = Column(String(50), default="default", nullable=False)

    # (futuro) nome do template, assinatura digital, QR code
    template_nome = Column(String, nullable=True)
    assinatura_digital = Column(String, nullable=True)

    # Restrição: 1 certificado por inscrição
    __table_args__ = (
        UniqueConstraint("inscricao_id", name="uq_certificado_inscricao"),
    )