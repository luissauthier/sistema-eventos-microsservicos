# servico_usuarios/src/database.py

"""
Módulo de configuração de banco de dados para o serviço de usuários.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError

from servico_comum.logger import configure_logger


# ============================================================
#  Logger corporativo
# ============================================================

logger = configure_logger("database")


# ============================================================
#  Base Declarativa Moderna (SQLAlchemy 2.0+)
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
#  Carregamento seguro das variáveis de ambiente
# ============================================================

def load_env_var(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(f"Variável de ambiente obrigatória não definida: {var_name}")
    return value


POSTGRES_USER = load_env_var("POSTGRES_USER")
POSTGRES_PASSWORD = load_env_var("POSTGRES_PASSWORD")
POSTGRES_DB = load_env_var("POSTGRES_DB")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")  # default do Docker Compose
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)


# ============================================================
#  Criação do Engine (PROFISSIONAL)
# ============================================================

# Engine configurado com parâmetros robustos
engine = create_engine(
    DATABASE_URL,
    pool_size=10,                 # número padrão de conexões
    max_overflow=20,              # conexões extras se necessário
    pool_pre_ping=True,           # detecta conexões mortas
    pool_recycle=1800,            # recicla conexões após 30 min
    connect_args={"application_name": "servico_usuarios"}
)


# Teste inicial da conexão (apenas 1 vez)
try:
    with engine.connect() as conn:
        logger.info("Conexão com o banco de dados estabelecida com sucesso.")
except OperationalError as e:
    logger.error("Falha ao conectar-se ao banco de dados", extra={"error": str(e)})
    raise e


# ============================================================
#  Sessão
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,   # evita problemas de refresh automático
    bind=engine
)


# ============================================================
#  Dependência do FastAPI: fornece uma sessão por requisição
# ============================================================

def get_db():
    """
    Fornece uma sessão de banco de dados para cada requisição.
    Encerra automaticamente ao fim.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()