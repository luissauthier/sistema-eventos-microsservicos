# servico_certificados/src/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# Importa nossos módulos locais
import models
import schemas
import security
from database import engine, get_db

# Cria as tabelas no DB (certificados e presencas)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Serviço de Certificados",
    version="1.0.0"
)

# --- Endpoint de Emissão (Protegido) ---
@app.post("/certificados", response_model=schemas.Certificado, status_code=status.HTTP_201_CREATED)
def create_certificado(
    certificado_in: schemas.CertificadoCreate,
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    [cite_start]Emite um novo certificado[cite: 28, 79].
    
    Regra de Negócio: Só permite a emissão se o usuário 
    tiver um registro de 'presença' para o evento.
    """
    
    # 1. VERIFICA A PRESENÇA (Lógica de Negócio)
    # Verifica se existe um registro de presença para este usuário E este evento
    presenca = db.query(models.Presenca).filter(
        models.Presenca.usuario_id == current_user.id,
        models.Presenca.evento_id == certificado_in.evento_id
    ).first()
    
    if not presenca:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Emissão de certificado negada: O usuário não compareceu ao evento."
        )

    # 2. VERIFICA IDEMPOTÊNCIA
    # O usuário já emitiu este certificado?
    db_certificado = db.query(models.Certificado).filter(
        models.Certificado.usuario_id == current_user.id,
        models.Certificado.evento_id == certificado_in.evento_id
    ).first()
    
    if db_certificado:
        # Se já existe, apenas retorna o existente.
        return db_certificado

    # 3. CRIA O NOVO CERTIFICADO
    db_certificado = models.Certificado(
        usuario_id=current_user.id,
        evento_id=certificado_in.evento_id,
        nome_usuario=current_user.full_name or current_user.username,
        nome_evento=certificado_in.nome_evento
        # O codigo_autenticacao é gerado por default pelo model
    )
    
    db.add(db_certificado)
    db.commit()
    db.refresh(db_certificado)
    
    return db_certificado

# --- Endpoint de Validação (Público) ---
@app.get("/certificados/validar/{codigo_autenticacao}", response_model=schemas.Certificado)
def validate_certificado(
    codigo_autenticacao: str,
    db: Session = Depends(get_db)
):
    """
    [cite_start]Verifica a autenticidade de um certificado [cite: 29, 80]
    [cite_start]usando seu código único[cite: 18].
    Esta rota é PÚBLICA.
    """
    db_certificado = db.query(models.Certificado).filter(
        models.Certificado.codigo_autenticacao == codigo_autenticacao
    ).first()
    
    if not db_certificado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificado não encontrado ou inválido"
        )
        
    return db_certificado