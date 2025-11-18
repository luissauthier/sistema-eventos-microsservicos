from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("exceptions")

class ServiceError(Exception):
    def __init__(self, message, status_code=400, details=None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}

async def service_error_handler(request: Request, exc: Exception):
    """
    Handler de erros central: evita acessar atributos que nem todo exception tem.
    """
    request_id = getattr(request.state, "request_id", None)

    # Mensagem segura e serializável
    msg = str(exc)

    # Status code compatível (nem todo exc tem status_code)
    status_code = getattr(exc, "status_code", 500)

    logger.error(msg, extra={"request_id": request_id})

    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": msg, "request_id": request_id},
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    rid = getattr(request.state, "request_id", None)

    logger.warning("Validation error", extra={"request_id": rid})

    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "details": exc.errors(),
            "request_id": rid
        }
    )