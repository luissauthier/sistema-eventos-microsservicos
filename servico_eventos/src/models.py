# servico_eventos/src/models.py

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from sqlalchemy.dialects.postgresql import UUID
import uuid

# ============================================================
#  ENUMS DE STATUS
# ============================================================

class InscricaoStatus(str, enum.Enum):
    ATIVA = "ativa"
    CANCELADA = "cancelada"
    PENDENTE_SYNC = "pendente_sync"  # usado no modo offline


class PresencaOrigem(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    SINCRONIZADO = "sincronizado"


# ============================================================
#  EVENTO
# ============================================================

class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    data_evento = Column(DateTime(timezone=True), nullable=False)

    template_certificado = Column(String(50), default="default", nullable=False)

    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    inscricoes = relationship("Inscricao", back_populates="evento", cascade="all,delete")
    presencas = relationship("Presenca", back_populates="evento", cascade="all,delete")

    certificados = relationship("Certificado", back_populates="evento", cascade="all,delete")
    checkin_tokens = relationship("CheckinToken", back_populates="evento", cascade="all,delete")

    def __repr__(self):
        return f"<Evento id={self.id} nome='{self.nome}'>"
    


# ============================================================
#  INSCRIÇÃO
# ============================================================

class Inscricao(Base):
    __tablename__ = "inscricoes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, nullable=False, index=True)

    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False, index=True)
    evento = relationship("Evento", back_populates="inscricoes")

    data_inscricao = Column(DateTime(timezone=True), server_default=func.now())

    usuario_username = Column(String(50), index=True)

    status = Column(
        Enum(InscricaoStatus),
        default=InscricaoStatus.ATIVA,
        nullable=False
    )

    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    presencas = relationship("Presenca", back_populates="inscricao", cascade="all,delete")
    certificado = relationship("Certificado", back_populates="inscricao", uselist=False)

    def __repr__(self):
        return f"<Inscricao id={self.id} usuario={self.usuario_username} evento={self.evento_id} status={self.status}>"
    
    @property
    def checkin_realizado(self) -> bool:
        return len(self.presencas) > 0


# ============================================================
#  PRESENÇA
# ============================================================

class Presenca(Base):
    __tablename__ = "presencas"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False, index=True)
    inscricao_id = Column(Integer, ForeignKey("inscricoes.id"), nullable=False, index=True)

    data_checkin = Column(DateTime(timezone=True), server_default=func.now())

    origem = Column(
        Enum(PresencaOrigem),
        default=PresencaOrigem.ONLINE,
        nullable=False
    )

    evento = relationship("Evento", back_populates="presencas")
    inscricao = relationship("Inscricao", back_populates="presencas")

    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Presenca usuario={self.usuario_id} evento={self.evento_id} origem={self.origem}>"


# ============================================================
#  CERTIFICADO
# ============================================================

class Certificado(Base):
    __tablename__ = "certificados"

    id = Column(Integer, primary_key=True, index=True)

    inscricao_id = Column(Integer, ForeignKey("inscricoes.id"), nullable=False, unique=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)

    codigo_unico = Column(String(64), unique=True, index=True)  # hash seguro
    data_emissao = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    inscricao = relationship("Inscricao", back_populates="certificado")
    evento = relationship("Evento", back_populates="certificados")

    def __repr__(self):
        return f"<Certificado codigo={self.codigo_unico} inscricao={self.inscricao_id}>"
    
# ============================================================
#  TOKEN DE CHECK-IN POR QR CODE
# ============================================================

def gerar_token_uuid():
    """Gera um UUID v4 para ser o token."""
    return str(uuid.uuid4())

class CheckinToken(Base):
    __tablename__ = "checkin_tokens"

    # Token UUID é a chave primária e o valor que vai no QR Code
    token = Column(UUID(as_uuid=False), primary_key=True, default=gerar_token_uuid)

    # Liga ao evento
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False, index=True)

    # Metadados
    data_expiracao = Column(DateTime(timezone=True), nullable=False)
    # Flag que permite desativar o token manualmente (ex: se o QR Code vazou)
    is_active = Column(Boolean, default=True, nullable=False) 

    # Relação com Evento
    evento = relationship("Evento", back_populates="checkin_tokens")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CheckinToken token={self.token} evento={self.evento_id}>"