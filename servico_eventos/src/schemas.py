# servico_eventos/src/schemas.py

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from datetime import datetime
from models import InscricaoStatus, PresencaOrigem
from uuid import UUID


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
    template_certificado: Optional[str] = "default"

    _sanitize = field_validator("nome", "descricao", mode="before")(strip)


class EventoCreate(EventoBase):
    """Dados necessários para criar um evento (admin)."""
    pass


class Evento(EventoBase):
    """Dados públicos retornados de um evento."""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class EventoUpdate(BaseModel):
    """Campos opcionais para atualização"""
    nome: Optional[str] = Field(None, min_length=3, max_length=150)
    descricao: Optional[str] = Field(None, max_length=2000)
    data_evento: Optional[datetime] = None

    _sanitize = field_validator("nome", "descricao", mode="before")(strip)


# ============================================================
#  CERTIFICADOS (Definido antes para ser usado em InscricaoDetalhes)
# ============================================================

class Certificado(BaseModel):
    id: int
    codigo_unico: str
    data_emissao: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class CertificadoValidacaoRequest(BaseModel):
    codigo: str = Field(..., min_length=10, max_length=64)


class CertificadoValidacaoResponse(BaseModel):
    valido: bool
    evento: Optional[str] = None
    usuario: Optional[str] = None
    data_emissao: Optional[datetime] = None


# ============================================================
#  INSCRIÇÕES
# ============================================================

class InscricaoBase(BaseModel):
    evento_id: int


class InscricaoCreate(InscricaoBase):
    pass


class InscricaoAdminCreate(InscricaoBase):
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

    model_config = ConfigDict(from_attributes=True)


class InscricaoDetalhes(Inscricao):
    """
    Inscrição com detalhes completos.
    IMPORTANTE: O campo 'certificado' é essencial para o Frontend exibir o botão de download.
    """
    evento: Optional[Evento] = None
    checkin_realizado: bool = False
    certificado: Optional[Certificado] = None


class InscricaoCancelamento(BaseModel):
    justificativa: Optional[str] = Field(None, max_length=300)
    _sanitize = field_validator("justificativa", mode="before")(strip)


# ============================================================
#  PRESENÇA
# ============================================================

class PresencaCreate(BaseModel):
    inscricao_id: int
    origem: PresencaOrigem = PresencaOrigem.ONLINE


class PresencaOfflineSync(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)


# ============================================================
#  SINCRONIZAÇÃO OFFLINE
# ============================================================

class SyncPayload(BaseModel):
    presencas: List[PresencaOfflineSync]
    timestamp_cliente: datetime


# ============================================================
#  CHECK-IN QR CODE
# ============================================================

class CheckinTokenCreate(BaseModel):
    evento_id: int = Field(..., description="ID do evento para gerar o token.")
    duracao_minutos: Optional[int] = Field(60, gt=0, description="Duração de validade do token em minutos.")


class CheckinTokenResponse(BaseModel):
    token: str
    url_publica: str = Field(..., description="URL completa que deve ser codificada no QR Code.")
    data_expiracao: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CheckinQRCodeResult(BaseModel):
    status: str = "success"
    message: str
    inscricao_id: int
    presenca_registrada: bool = False

    model_config = ConfigDict(from_attributes=True)

class TokenAndUserCheckin(BaseModel):
    token: UUID
    user_id: int = Field(..., description="ID do usuário que está fazendo o check-in.")

class PresencaResponse(BaseModel):
    id: int
    inscricao_id: int
    data_registro: datetime
    status: str = Field(..., description="Mensagem de status do check-in.")

    model_config = ConfigDict(from_attributes=True)