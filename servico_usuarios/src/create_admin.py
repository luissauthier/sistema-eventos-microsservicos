# servico_usuarios/src/create_admin.py
from database import SessionLocal
from models import User
from auth import get_password_hash

def create_super_user():
    db = SessionLocal()
    username = "admin"
    
    # Verifica se já existe
    if db.query(User).filter(User.username == username).first():
        print(f"Usuário {username} já existe.")
        return

    user = User(
        username=username,
        email="admin@sistema.com",
        full_name="Administrador do Sistema",
        hashed_password=get_password_hash("admin123"), # Senha desejada
        is_active=True,
        is_verified=True,
        is_admin=True,
        is_superuser=True
    )
    
    db.add(user)
    db.commit()
    print(f"Admin criado com sucesso! User: {username}")
    db.close()

if __name__ == "__main__":
    create_super_user()