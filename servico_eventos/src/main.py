# servico_eventos/src/main.py
from fastapi import FastAPI, Request
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import ServiceError, service_error_handler

from database import engine
import models
from routers import eventos, inscricoes, presencas

# Inicializa Banco
models.Base.metadata.create_all(bind=engine)

# Configura Logs
logger = configure_logger("servico_eventos")

app = FastAPI(
    title="Serviço de Eventos",
    version="2.1.0",
    description="API Modularizada para gestão de eventos e sync offline.",
    root_path="/eventos",
)

app.add_middleware(RequestIDMiddleware)
app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)

# --- ROTEAMENTO AUTOMÁTICO ---
app.include_router(eventos.router)
app.include_router(inscricoes.router)
app.include_router(presencas.router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    # Lógica simplificada de log
    return response

@app.get("/")
def health_check():
    return {"status": "ok", "service": "servico_eventos"}