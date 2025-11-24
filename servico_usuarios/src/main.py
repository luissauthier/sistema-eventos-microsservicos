# servico_usuarios/src/main.py
from fastapi import FastAPI, Request
from servico_comum.logger import configure_logger
from servico_comum.middleware import RequestIDMiddleware
from servico_comum.exceptions import ServiceError, service_error_handler

from database import engine
import models
from routers import auth, usuarios

# Inicializa Banco
models.Base.metadata.create_all(bind=engine)

logger = configure_logger("servico_usuarios")

app = FastAPI(
    title="Serviço de Usuários",
    description="API de Identidade e Gestão de Usuários",
    version="2.0.0",
    root_path="/usuarios",
)

app.add_middleware(RequestIDMiddleware)
app.add_exception_handler(ServiceError, service_error_handler)
app.add_exception_handler(Exception, service_error_handler)

# --- ROTAS ---
app.include_router(auth.router)
app.include_router(usuarios.router)

@app.middleware("http")
async def request_logger(request: Request, call_next):
    response = await call_next(request)
    # O logger detalhado já é tratado nas rotas ou libs comuns
    return response

@app.get("/")
def health_check():
    return {"status": "ok", "service": "servico_usuarios"}