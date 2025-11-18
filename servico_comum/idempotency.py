import hashlib
import time

# Em produção → Redis
CACHE = {}

def make_key(raw: str):
    return hashlib.sha256(raw.encode()).hexdigest()

def idempotent(route: str, user_id: str, idem_key: str):
    """
    Retorna:
    - resposta anterior (se já feita)
    - ou chave gerada (se nova)
    """
    key = make_key(f"{route}:{user_id}:{idem_key}")

    if key in CACHE:
        return CACHE[key]

    return key

def store_response(key, response):
    CACHE[key] = response