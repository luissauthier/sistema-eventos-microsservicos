# servico_comum/logger.py
import logging
import sys
import os
import contextvars
from pythonjsonlogger import jsonlogger

# Variável de contexto segura para AsyncIO
request_id_context = contextvars.ContextVar("request_id", default="-")

class ContextFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_context.get()
        return True

def configure_logger(service_name: str):
    """
    Logger Híbrido: Console (Stdout) + Arquivo Persistente (JSON)
    """
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    
    if logger.handlers:
        return logger

    # Formato JSON Padronizado
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Handler de Console (Para 'docker logs')
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    # 2. Handler de Arquivo (Para persistência na VM)
    # Garante que a pasta existe
    log_dir = "/app/logs"
    if os.path.exists(log_dir):
        try:
            file_handler = logging.FileHandler(f"{log_dir}/{service_name}.json")
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            print(f"Aviso: Não foi possível criar log em arquivo: {e}")

    # Filtro de Contexto (Request ID)
    logger.addFilter(ContextFilter())
    logger.propagate = False

    return logger
