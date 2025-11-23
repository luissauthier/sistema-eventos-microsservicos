# servico_comum/middleware.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from .logger import request_id_context, configure_logger

logger = configure_logger("middleware")
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        token = request_id_context.set(request_id)
        
        request.state.request_id = request_id

        logger.info(f"Incoming request: {request.method} {request.url.path}")

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_context.reset(token)