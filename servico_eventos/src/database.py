# servico_eventos/src/database.py

"""
Módulo de configuração de banco de dados para o serviço de eventos.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError

from servico_comum.logger import configure_logger

# ============================================================
#  LOGGER DO SERVIÇO
# ============================================================

logger = configure_logger("servico_eventos.database")


# ============================================================
#  BASE DECLARATIVA MODERNA (SQLAlchemy 2.0+)
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
#  CARREGAMENTO SEGURO DE VARIÁVEIS DE AMBIENTE
# ============================================================

def read_env(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(f"Variável de ambiente obrigatória não definida: {var_name}")
    return value


POSTGRES_USER = read_env("POSTGRES_USER")
POSTGRES_PASSWORD = read_env("POSTGRES_PASSWORD")
POSTGRES_DB = read_env("POSTGRES_DB")

# Nome do container do Postgres no Docker Compose
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

# Porta padrão
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
    pool_size=15,              # mais conexões para serviços que lidam com eventos
    max_overflow=25,
    pool_pre_ping=True,
    pool_recycle=600,         # recicla após 30m (evita timeouts do Postgres)
    connect_args={
        "application_name": "servico_eventos", # <--- Nome correto do serviço
        # Configurações de Keepalive (Anti-Congelamento)
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }
)


# Teste inicial (log obrigatório)
try:
    with engine.connect() as conn:
        logger.info("Conexão com o banco de eventos estabelecida com sucesso.")
except OperationalError as e:
    logger.error(
        "Falha ao conectar-se ao banco de dados do serviço de eventos",
        extra={"error": str(e)}
    )
    raise e


# ============================================================
#  SESSÃO
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine
)


# ============================================================
#  DEPENDÊNCIA DO FASTAPI
# ============================================================

def get_db():
    """
    Fornece uma sessão de banco para cada requisição.
    É fechada automaticamente ao final.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
