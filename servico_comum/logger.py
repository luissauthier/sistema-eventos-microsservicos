# servico_comum/logger.py
import logging
import sys
import contextvars
from pythonjsonlogger import jsonlogger

request_id_context = contextvars.ContextVar("request_id", default="-")

class ContextFilter(logging.Filter):
    """
    Injeta o request_id do contexto atual no registro de log.
    """
    def filter(self, record):
        record.request_id = request_id_context.get()
        return True

def configure_logger(service_name: str):
    """
    Logger corporativo padrão.
    Saída: JSON Estruturado.
    """
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)
    
    if logger.handlers:
        return logger

    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    
    logger.addFilter(ContextFilter())
    logger.addHandler(handler)
    logger.propagate = False

    return logger