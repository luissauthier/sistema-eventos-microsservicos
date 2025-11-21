# servico_eventos/src/services/integracao.py
import httpx
import asyncio
from servico_comum.logger import configure_logger

logger = configure_logger("service_integracao")

NOTIFICATION_URL = "http://servico_notificacoes:8004/emails"
CERTIFICADOS_URL = "http://servico_certificados:8000"
USUARIOS_URL = "http://servico_usuarios:8000"

async def send_notification_guaranteed(payload: dict):
    """Tenta enviar notificação com retry (Backoff exponencial)."""
    delay = 0.5
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                await client.post(NOTIFICATION_URL, json=payload)
            logger.info("notification_sent", extra=payload)
            return
        except httpx.RequestError as e:
            logger.error("notification_failed", extra={"error": str(e), "attempt": attempt + 1})
            await asyncio.sleep(delay)
            delay *= 2

async def solicitar_emissao_certificado_automatica(inscricao, user_email, evento):
    """Solicita a emissão de certificado ao microsserviço correspondente."""
    try:
        payload = {
            "inscricao_id": inscricao.id,
            "usuario_id": inscricao.usuario_id,
            "evento_id": inscricao.evento_id,
            "usuario_nome": inscricao.usuario_username,
            "usuario_email": user_email,
            "evento_nome": evento.nome,
            "evento_data": str(evento.data_evento),
            "template_certificado": getattr(evento, "template_certificado", "default")
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{CERTIFICADOS_URL}/interno/certificados/emitir_automatico",
                json=payload
            )
            resp.raise_for_status()
            logger.info("certificado_emitido_sucesso", extra={"inscricao_id": inscricao.id})
            
    except Exception as e:
        logger.error("falha_integracao_certificado", extra={"erro": str(e), "inscricao": inscricao.id})

async def fetch_user_data(usuario_id: int):
    """Busca dados atualizados do usuário no microsserviço de usuários."""
    async with httpx.AsyncClient(timeout=3.0) as client:
        resp = await client.get(f"{USUARIOS_URL}/usuarios/{usuario_id}")
        resp.raise_for_status()
        return resp.json()
    
async def emitir_certificado_sincrono(inscricao, user_email, evento):
    """
    Chama o serviço de certificados e retorna os dados (codigo_unico) para salvar localmente.
    """
    try:
        payload = {
            "inscricao_id": inscricao.id,
            "usuario_id": inscricao.usuario_id,
            "evento_id": inscricao.evento_id,
            "usuario_nome": inscricao.usuario_username,
            "usuario_email": user_email,
            "evento_nome": evento.nome,
            "evento_data": str(evento.data_evento),
            "template_certificado": getattr(evento, "template_certificado", "default")
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{CERTIFICADOS_URL}/interno/certificados/emitir_automatico",
                json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("certificado_emitido_remoto", extra={"codigo": data.get("codigo_unico")})
            return data
            
    except Exception as e:
        logger.error("falha_integracao_certificado", extra={"erro": str(e), "inscricao": inscricao.id})
        return None