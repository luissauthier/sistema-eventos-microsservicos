from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME")
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "sistema-eventos"

def create_access_token(sub: str, roles=None, expires_minutes=60, extra_claims: dict = None):
    now = datetime.utcnow()
    payload = {
        "sub": sub,
        "roles": roles or [],
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "iss": JWT_ISSUER,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

async def get_current_user(req: Request, creds=Depends(security)):
    token = creds.credentials
    payload = decode_token(token)
    req.state.user = payload
    return payload

def require_roles(*allowed_roles):
    async def wrapper(user=Depends(get_current_user)):
        roles = user.get("roles", [])
        if not any(r in roles for r in allowed_roles):
            raise HTTPException(
                status_code=403,
                detail="Permissões insuficientes"
            )
        return user
    return wrapper