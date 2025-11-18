# servico_eventos/src/schemas.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from models import InscricaoStatus, PresencaOrigem


# ============================================================
#  UTILIDADES DE SANITIZAÇÃO
# ============================================================

def strip(v: Optional[str]) -> Optional[str]:
    if isinstance(v, str):
        return v.strip()
    return v


# ============================================================
#  EVENTOS
# ============================================================

class EventoBase(BaseModel):
    nome: str = Field(..., min_length=3, max_length=150)
    descricao: Optional[str] = Field(None, max_length=2000)
    data_evento: datetime

    _sanitize = field_validator("nome", "descricao", mode="before")(strip)


class EventoCreate(EventoBase):
    """Dados necessários para criar um evento (admin)."""
    pass


class Evento(EventoBase):
    """Dados públicos retornados de um evento."""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EventoUpdate(BaseModel):
    """Campos opcionais para atualização"""
    nome: Optional[str] = Field(None, min_length=3, max_length=150)
    descricao: Optional[str] = Field(None, max_length=2000)
    data_evento: Optional[datetime] = None

    _sanitize = field_validator("nome", "descricao", mode="before")(strip)


# ============================================================
#  INSCRIÇÕES
# ============================================================

class InscricaoBase(BaseModel):
    evento_id: int


class InscricaoCreate(InscricaoBase):
    """
    Inscrição feita pelo próprio usuário.
    usuario_id vem do token.
    """
    pass


class InscricaoAdminCreate(InscricaoBase):
    """
    Inscrição criada pelo administrador para outro usuário.
    """
    usuario_id: int


class Inscricao(BaseModel):
    id: int
    usuario_id: int
    evento_id: int
    usuario_username: Optional[str] = None
    status: InscricaoStatus
    data_inscricao: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InscricaoDetalhes(Inscricao):
    """
    Inscrição com detalhes completos do evento: usada nas telas de usuário.
    """
    evento: Optional[Evento] = None
    checkin_realizado: bool = False


class InscricaoCancelamento(BaseModel):
    """
    Modelo para cancelar uma inscrição.
    """
    justificativa: Optional[str] = Field(None, max_length=300)

    _sanitize = field_validator("justificativa", mode="before")(strip)


# ============================================================
#  PRESENÇA
# ============================================================

class PresencaCreate(BaseModel):
    """
    Criar presença (check-in).
    O atendente registra via inscricao_id.
    """
    inscricao_id: int
    origem: PresencaOrigem = PresencaOrigem.ONLINE


class PresencaOfflineSync(BaseModel):
    """
    Usado no modo offline para sincronizar múltiplas presenças.
    """
    inscricao_id: int
    data_checkin: datetime
    origem: PresencaOrigem = PresencaOrigem.OFFLINE


class Presenca(BaseModel):
    id: int
    usuario_id: int
    evento_id: int
    inscricao_id: int
    origem: PresencaOrigem
    data_checkin: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
#  CERTIFICADOS
# ============================================================

class Certificado(BaseModel):
    id: int
    inscricao_id: int
    evento_id: int
    codigo_unico: str
    data_emissao: datetime

    class Config:
        from_attributes = True


class CertificadoValidacaoRequest(BaseModel):
    """
    API pública para validar um certificado.
    """
    codigo: str = Field(..., min_length=10, max_length=64)


class CertificadoValidacaoResponse(BaseModel):
    """
    Retorno da validação do certificado.
    """
    valido: bool
    evento: Optional[str] = None
    usuario: Optional[str] = None
    data_emissao: Optional[datetime] = None


# ============================================================
#  SINCRONIZAÇÃO OFFLINE
# ============================================================

class SyncPayload(BaseModel):
    """
    Payload enviado pelo app offline para sincronizar.
    """
    presencas: List[PresencaOfflineSync]
    timestamp_cliente: datetime