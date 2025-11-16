# servico_certificados/src/schemas.py

from datetime import datetime
from pydantic import BaseModel, ConfigDict
import uuid


# ============================================================
#  SCHEMAS BASE
# ============================================================

class CertificadoBase(BaseModel):
    """Campos principais comuns aos DTOs."""
    codigo_unico: uuid.UUID
    data_emissao: datetime


# ============================================================
#  ENTRADA — EMISSÃO MANUAL PELO ADMIN
# ============================================================

class CertificadoEmissaoManual(BaseModel):
    """
    Para:
      - POST /admin/certificados/emissao
    """
    inscricao_id: int


# ============================================================
#  SAÍDA — CERTIFICADO COMPLETO (ADMIN)
# ============================================================

class CertificadoDetalhado(CertificadoBase):
    """
    Resposta completa:
      - admin listagem
      - consultas internas
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    inscricao_id: int
    usuario_id: int
    evento_id: int
    usuario_nome: str
    usuario_email: str
    evento_nome: str
    evento_data: datetime | None
    origem_automatica: bool
    template_nome: str | None
    assinatura_digital: str | None


# ============================================================
#  SAÍDA — CERTIFICADO SIMPLES (EMISSÃO AUTOMÁTICA)
# ============================================================

class CertificadoSimples(CertificadoBase):
    """
    Usado em:
      - emissão automática após check-in
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    inscricao_id: int
    usuario_id: int
    evento_id: int


# ============================================================
#  VALIDAÇÃO PÚBLICA DE CERTIFICADOS
# ============================================================

class CertificadoValidacaoResponse(BaseModel):
    """
    Resposta pública para:
      GET /certificados/validar/{codigo}
    """
    valido: bool
    evento: str | None = None
    usuario: str | None = None
    data_emissao: datetime | None = None


# ============================================================
#  LISTAGENS (ADMIN)
# ============================================================

class CertificadoListagem(BaseModel):
    """
    Retorno minimalista para listagens internas.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_unico: uuid.UUID
    usuario_nome: str
    evento_nome: str
    data_emissao: datetime