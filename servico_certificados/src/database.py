# servico_certificados/src/database.py

"""
Configuração profissional de banco de dados para o serviço de certificados.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError

from servico_comum.logger import configure_logger


# ============================================================
#  LOGGER CORPORATIVO
# ============================================================

logger = configure_logger("servico_certificados.database")


# ============================================================
#  BASE DECLARATIVA MODERNA
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
#  CARREGAMENTO SEGURO DE VARIÁVEIS DE AMBIENTE
# ============================================================

def read_env(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {var_name}")
    return value


POSTGRES_USER = read_env("POSTGRES_USER")
POSTGRES_PASSWORD = read_env("POSTGRES_PASSWORD")
POSTGRES_DB = read_env("POSTGRES_DB")

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)


# ============================================================
#  ENGINE PROFISSIONAL
# ============================================================

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,           # Evita conexões mortas
    pool_recycle=1800,            # Recicla após 30 minutos
    connect_args={"application_name": "servico_certificados"}
)


# Teste imediato da conexão — essencial para produção
try:
    with engine.connect() as conn:
        logger.info("Conexão com banco do serviço_certificados estabelecida com sucesso.")
except OperationalError as e:
    logger.error(
        "Falha ao conectar ao banco do serviço_certificados",
        extra={"error": str(e)}
    )
    raise e


# ============================================================
#  SESSÃO POR REQUISIÇÃO
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine
)


def get_db():
    """
    Sessão de banco para cada requisição.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()