# servico_eventos/src/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- Evento ---
class EventoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    data_evento: datetime

# ADICIONE ESTA CLASSE
class EventoCreate(EventoBase):
    pass # Os campos são os mesmos do EventoBase

class Evento(EventoBase):
    id: int
    class Config:
        from_attributes = True

# --- Inscrição ---
class InscricaoCreate(BaseModel):
    evento_id: int
    # O usuario_id virá do token, não do body

class Inscricao(BaseModel):
    id: int
    usuario_id: int
    evento_id: int
    data_inscricao: datetime
    usuario_username: Optional[str] = None
    class Config:
        from_attributes = True

# --- Presença (Check-in) ---
class PresencaCreate(BaseModel):
    # O atendente fará o check-in por ID de inscrição ou ID de usuário
    inscricao_id: int 

class Presenca(BaseModel):
    id: int
    inscricao_id: int
    usuario_id: int
    evento_id: int
    data_checkin: datetime
    class Config:
        from_attributes = True