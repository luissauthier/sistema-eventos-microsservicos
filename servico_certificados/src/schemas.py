# servico_certificados/src/schemas.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class CertificadoRequest(BaseModel):
    """Payload recebido do Servico de Eventos"""
    inscricao_id: int
    usuario_id: int
    evento_id: int
    usuario_nome: str
    usuario_email: str
    evento_nome: str
    evento_data: str
    template_certificado: str = "default"

class CertificadoResponse(BaseModel):
    codigo_unico: str
    url_download: str
    status: str