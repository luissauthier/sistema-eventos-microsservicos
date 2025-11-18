# servico_usuarios/src/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """
    Modelo de Usuário do sistema.
    """

    __tablename__ = "usuarios"

    # ---------------------------
    # Identificação / Metadados
    # ---------------------------
    id = Column(Integer, primary_key=True, index=True)

    # ---------------------------
    # Credenciais e Identidade
    # ---------------------------
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # ---------------------------
    # Informações do Perfil
    # ---------------------------
    full_name = Column(String(100), index=True, nullable=True)
    email = Column(String(120), unique=True, index=True, nullable=True)
    cpf = Column(String(14), unique=True, index=True, nullable=True)
    telefone = Column(String(20), nullable=True)
    endereco = Column(String(255), nullable=True)

    # ---------------------------
    # Flags de Permissão
    # ---------------------------
    is_admin = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # ---------------------------
    # Flags de Estado
    # ---------------------------
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # ---------------------------
    # Auditoria
    # ---------------------------
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # ---------------------------
    # Representação profissional
    # ---------------------------
    def __repr__(self):
        return (
            f"<User id={self.id} username={self.username} "
            f"email={self.email} admin={self.is_admin}>"
        )
