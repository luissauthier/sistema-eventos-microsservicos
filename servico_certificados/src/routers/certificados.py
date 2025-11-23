from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

import models
import schemas
from database import get_db
from services.gerador import PDFGeneratorService
from servico_comum.logger import configure_logger

router = APIRouter(tags=["Certificados"])
logger = configure_logger("router_certificados")

@router.post(
    "/interno/certificados/emitir_automatico", 
    response_model=schemas.CertificadoResponse,
    status_code=status.HTTP_201_CREATED
)
def emitir_certificado_interno(
    payload: schemas.CertificadoRequest,
    db: Session = Depends(get_db)
):
    """
    Gera o hash, salva os metadados e devolve a URL de download.
    """
    # 1. Gera Hash
    codigo = PDFGeneratorService.gerar_hash(payload.model_dump())
    
    # 2. Verifica se já existe (Idempotência)
    existente = db.query(models.CertificadoMetadata).filter_by(codigo_unico=codigo).first()
    if not existente:
        # 3. Salva Metadados para geração futura
        novo_cert = models.CertificadoMetadata(
            codigo_unico=codigo,
            participante_nome=payload.usuario_nome,
            evento_nome=payload.evento_nome,
            evento_data=payload.evento_data,
            template_nome=payload.template_certificado,
            dados_extras=payload.model_dump()
        )
        db.add(novo_cert)
        db.commit()
    
    return {
        "codigo_unico": codigo,
        # URL pública que o Nginx vai rotear
        "url_download": f"http://177.44.248.76/certificados/download/{codigo}",
        "status": "emitido",
        "data_emissao": datetime.utcnow()
    }

@router.get("/certificados/download/{codigo}")
def download_certificado(codigo: str, db: Session = Depends(get_db)):
    """
    Gera o binário do PDF sob demanda.
    """
    cert_data = db.query(models.CertificadoMetadata).filter_by(codigo_unico=codigo).first()
    
    if not cert_data:
        raise HTTPException(status_code=404, detail="Certificado não encontrado")

    # Gera o PDF em memória
    pdf_buffer = PDFGeneratorService.gerar_pdf_bytes(cert_data)
    
    # Retorna como stream de arquivo
    filename = f"certificado_{codigo}.pdf"
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/certificados/validar/{codigo}")
def validar_certificado(codigo: str, db: Session = Depends(get_db)):
    cert = db.query(models.CertificadoMetadata).filter_by(codigo_unico=codigo).first()
    
    if not cert:
        return {"valido": False}

    return {
        "valido": True,
        "participante": cert.participante_nome,
        "evento": cert.evento_nome,
        "data_emissao": cert.created_at
    }
