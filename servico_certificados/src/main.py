# servico_certificados/src/main.py

from typing import List
from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

# Infra
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import ServiceError, service_error_handler
from servico_comum.responses import success

# Domínio local
import models
import schemas
from database import engine, get_db
from security import get_current_user, get_current_admin_user


# ============================================================
#  INICIALIZAÇÃO DO SERVIÇO
# ============================================================

models.Base.metadata.create_all(bind=engine)

logger = configure_logger("servico_certificados")

app = FastAPI(
    title="Serviço de Certificados",
    version="2.0.0",
    description="Emissão, consulta e validação de certificados com snapshot completo."
)

app.add_middleware(RequestIDMiddleware)

app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)


# ============================================================
#  HEALTHCHECK (opcional mas recomendado)
# ============================================================

@app.get("/", tags=["Health"])
def health():
    return success("servico_certificados operacional")


# ============================================================
#  EMISSÃO MANUAL — ADMIN
# ============================================================

@app.post(
    "/admin/certificados/emissao",
    tags=["Admin"],
    response_model=schemas.CertificadoDetalhado,
    status_code=201
)
def emitir_certificado_manual(
    data: schemas.CertificadoEmissaoManual,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user)
):
    """
    Admin emite um certificado a partir do ID da inscrição fornecido.
    Os dados do usuário e do evento vêm do servico_eventos.
    """

    # 1. Buscar dados no servico_eventos (snapshot)
    from httpx import AsyncClient

    async def obter_dados_inscricao():
        async with AsyncClient() as cli:
            r = await cli.get(f"http://servico_eventos:8000/inscricoes/{data.inscricao_id}")
            if r.status_code == 404:
                raise ServiceError("Inscrição não encontrada no serviço de eventos", 404)
            r.raise_for_status()
            return r.json()

    insc = asyncio.run(obter_dados_inscricao())

    # Idempotência — já existe?
    existente = db.query(models.Certificado).filter_by(
        inscricao_id=data.inscricao_id
    ).first()

    if existente:
        return existente

    # Criar snapshot
    cert = models.Certificado(
        inscricao_id=data.inscricao_id,
        usuario_id=insc["usuario_id"],
        evento_id=insc["evento_id"],
        usuario_nome=insc["usuario_username"],
        usuario_email=insc["evento"]["responsavel_email"] if "responsavel_email" in insc else "<desconhecido>",
        evento_nome=insc["evento"]["nome"],
        evento_data=insc["evento"]["data_evento"],
        origem_automatica=False,
        template_certificado=insc["evento"].get("template_certificado", "default")
    )

    db.add(cert)
    db.commit()
    db.refresh(cert)

    logger.info("certificate_issued_manual", extra={"certificado_id": cert.id})

    return cert


# ============================================================
#  EMISSÃO AUTOMÁTICA — USADO PELO SERVICO_EVENTOS
# ============================================================

@app.post(
    "/interno/certificados/emitir_automatico",
    tags=["Interno"],
    response_model=schemas.CertificadoSimples,
    status_code=201
)
def emitir_certificado_automatico(payload: dict, db: Session = Depends(get_db)):
    """
    Endpoint interno usado exclusivamente pelo servico_eventos
    para emissão automática após check-in.
    """

    inscricao_id = payload["inscricao_id"]
    usuario_id = payload["usuario_id"]
    evento_id = payload["evento_id"]
    usuario_nome = payload["usuario_nome"]
    usuario_email = payload["usuario_email"]
    evento_nome = payload["evento_nome"]
    evento_data = payload["evento_data"]

    template_certificado = payload.get("template_certificado", "default")

    # Idempotência
    existente = db.query(models.Certificado).filter_by(
        inscricao_id=inscricao_id
    ).first()

    if existente:
        return existente

    cert = models.Certificado(
        inscricao_id=inscricao_id,
        usuario_id=usuario_id,
        evento_id=evento_id,
        usuario_nome=usuario_nome,
        usuario_email=usuario_email,
        evento_nome=evento_nome,
        evento_data=evento_data,
        origem_automatica=True,
        template_certificado=template_certificado
    )

    db.add(cert)
    db.commit()
    db.refresh(cert)

    logger.info("certificate_issued_auto", extra={"inscricao": inscricao_id})

    return cert


# ============================================================
#  CONSULTA PÚBLICA (VALIDAÇÃO)
# ============================================================

@app.get(
    "/certificados/validar/{codigo}",
    tags=["Validação"],
    response_model=schemas.CertificadoValidacaoResponse
)
def validar_certificado(codigo: str, db: Session = Depends(get_db)):
    cert = db.query(models.Certificado).filter_by(codigo_unico=codigo).first()

    if not cert:
        return schemas.CertificadoValidacaoResponse(valido=False)

    return schemas.CertificadoValidacaoResponse(
        valido=True,
        evento=cert.evento_nome,
        usuario=cert.usuario_nome,
        data_emissao=cert.data_emissao,
        template_certificado=cert.template_certificado
    )


# ============================================================
#  LISTAGEM POR USUÁRIO — AUTENTICADO
# ============================================================

@app.get(
    "/certificados/me",
    tags=["Usuário"],
    response_model=List[schemas.CertificadoDetalhado]
)
def meus_certificados(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(models.Certificado).filter_by(
        usuario_id=user.id
    ).all()


# ============================================================
#  LISTAGEM GERAL — ADMIN
# ============================================================

@app.get(
    "/admin/certificados",
    tags=["Admin"],
    response_model=List[schemas.CertificadoListagem]
)
def listar_certificados(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user)
):
    return db.query(models.Certificado).order_by(
        models.Certificado.data_emissao.desc()
    ).all()


