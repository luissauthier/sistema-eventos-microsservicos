# servico_certificados/src/main.py
from fastapi import FastAPI, Request
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import ServiceError, service_error_handler

from routers import certificados

# Configuração
logger = configure_logger("servico_certificados")

app = FastAPI(
    title="Serviço de Certificados",
    description="Motor de geração e validação de documentos digitais",
    version="1.0.0",
    root_path="/certificados",
)

# Middlewares Corporativos
app.add_middleware(RequestIDMiddleware)
app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)

# Roteamento
app.include_router(certificados.router)

@app.middleware("http")
async def request_logger(request: Request, call_next):
    response = await call_next(request)
    return response

@app.get("/")
def health_check():
    return {"status": "ok", "service": "servico_certificados"}