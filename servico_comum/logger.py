import logging
import sys
from pythonjsonlogger import jsonlogger

def configure_logger(service_name: str):
    """
    Logger corporativo padrão para microsserviços.
    - Log estruturado em JSON
    - Suporte a request_id
    - Padrão para observabilidade distribuída
    """

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s"
    )
    handler.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(handler)

    return logger