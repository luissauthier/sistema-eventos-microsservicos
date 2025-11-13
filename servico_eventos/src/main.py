# servico_eventos/src/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, Query

# Importa nossos módulos locais
import models
import schemas
import security
from database import engine, get_db

# Cria as tabelas no DB (eventos, inscricoes, presencas)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Serviço de Eventos e Inscrições",
    version="1.0.0"
)

# --- Endpoints de Eventos (Públicos) ---

@app.get("/eventos", response_model=List[schemas.Evento])
def read_eventos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [cite_start]Consulta todos os eventos vigentes. [cite: 48]
    Esta rota é PÚBLICA, não requer token.
    """
    eventos = db.query(models.Evento).offset(skip).limit(limit).all()
    return eventos

@app.get("/eventos/{id}", response_model=schemas.Evento)
def read_evento(id: int, db: Session = Depends(get_db)):
    """
    [cite_start]Consulta um evento específico. [cite: 48]
    Esta rota também é PÚBLICA.
    """
    evento = db.query(models.Evento).filter(models.Evento.id == id).first()
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return evento

@app.post("/eventos", response_model=schemas.Evento, status_code=status.HTTP_201_CREATED)
def create_evento(
    evento: schemas.EventoCreate, 
    db: Session = Depends(get_db),
    # Protegido! Só usuários logados podem criar eventos.
    current_username: str = Depends(security.get_current_user)
):
    """
    Cria um novo evento.
    Esta rota é PROTEGIDA.
    """
    db_evento = models.Evento(
        nome=evento.nome,
        descricao=evento.descricao,
        data_evento=evento.data_evento
    )
    db.add(db_evento)
    db.commit()
    db.refresh(db_evento)
    return db_evento

# --- Endpoints de Inscrições (Protegidos) ---

@app.post("/inscricoes", response_model=schemas.Inscricao, status_code=status.HTTP_201_CREATED)
def create_inscricao(
    inscricao: schemas.InscricaoCreate, 
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Registra uma inscrição.
    Esta rota é PROTEGIDA.
    """
    
    # Verifica se o evento existe
    evento = db.query(models.Evento).filter(models.Evento.id == inscricao.evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
        
    # ---- CORREÇÃO DA DÍVIDA TÉCNICA ----
    # Agora usamos os dados reais do token
    db_inscricao = models.Inscricao(
        evento_id=inscricao.evento_id,
        usuario_id=current_user.id,          # <-- CORRIGIDO
        usuario_username=current_user.username # <-- CORRIGIDO
    )
    db.add(db_inscricao)
    db.commit()
    db.refresh(db_inscricao)
    return db_inscricao

# --- Endpoint de Presença (Protegido - Nível Atendente) ---

@app.post("/presencas", response_model=schemas.Presenca, status_code=status.HTTP_201_CREATED)
def register_presenca(
    presenca: schemas.PresencaCreate,
    db: Session = Depends(get_db),
    # Risco de Segurança: Esta rota deveria ter um nível de permissão
    # maior (ex: "atendente"), mas por enquanto, qualquer usuário logado pode usar.
    current_username: str = Depends(security.get_current_user)
):
    """
    [cite_start]Registra uma presença (check-in). [cite: 48]
    """
    # 1. Encontra a inscrição
    inscricao = db.query(models.Inscricao).filter(models.Inscricao.id == presenca.inscricao_id).first()
    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
        
    # 2. Verifica se a presença já foi registrada
    presenca_existente = db.query(models.Presenca).filter(models.Presenca.inscricao_id == inscricao.id).first()
    if presenca_existente:
        raise HTTPException(status_code=400, detail="Check-in já realizado para esta inscrição")

    # 3. Registra a presença
    db_presenca = models.Presenca(
        inscricao_id=inscricao.id,
        usuario_id=inscricao.usuario_id,
        evento_id=inscricao.evento_id
    )
    db.add(db_presenca)
    db.commit()
    db.refresh(db_presenca)
    return db_presenca

@app.delete("/inscricoes", status_code=status.HTTP_200_OK)
def delete_inscricao(
    # O ID é passado como um parâmetro de consulta, ex: /inscricoes?id=1
    inscricao_id: int = Query(..., alias="id"), 
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Cancela uma inscrição.
    Esta rota é PROTEGIDA.
    """
    
    # 1. Encontra a inscrição no banco de dados
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == inscricao_id
    ).first()

    # 2. Verifica se a inscrição existe
    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 3. VERIFICAÇÃO DE SEGURANÇA CRÍTICA:
    # O usuário logado (do token) é o dono desta inscrição?
    if db_inscricao.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para cancelar esta inscrição"
        )
        
    # 4. Verifica se já existe um check-in (regra de negócio)
    # Não podemos cancelar uma inscrição se o usuário já compareceu
    db_presenca = db.query(models.Presenca).filter(
        models.Presenca.inscricao_id == inscricao_id
    ).first()
    
    if db_presenca:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível cancelar: esta inscrição já possui um check-in."
        )

    # 5. Tudo certo, pode deletar
    db.delete(db_inscricao)
    db.commit()
    
    # TODO: Disparar e-mail de cancelamento (Sprint 3) [cite: 19]
    # (chamar o servico_notificacoes)

    return {"message": "Inscrição cancelada com sucesso"}

@app.get("/inscricoes/{id}", response_model=schemas.Inscricao)
def read_inscricao(
    id: int,
    db: Session = Depends(get_db),
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Consulta os detalhes de uma inscrição específica.
    Esta rota é PROTEGIDA.
    """
    
    # 1. Encontra a inscrição no banco de dados
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == id
    ).first()

    # 2. Verifica se a inscrição existe
    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 3. VERIFICAÇÃO DE SEGURANÇA CRÍTICA:
    # O usuário logado (do token) é o dono desta inscrição?
    if db_inscricao.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para visualizar esta inscrição"
        )
        
    # 4. Tudo certo, retorna a inscrição
    return db_inscricao

@app.post("/presencas", response_model=schemas.Presenca, status_code=status.HTTP_201_CREATED)
def register_presenca(
    presenca: schemas.PresencaCreate,
    db: Session = Depends(get_db),
    # TODO: Proteger esta rota para ser acessível apenas por "atendentes".
    # Por enquanto, qualquer usuário logado pode registrar uma presença.
    current_user: security.User = Depends(security.get_current_user)
):
    """
    Registra uma presença (check-in) para uma inscrição.
    Esta rota é PROTEGIDA.
    """
    
    # 1. Encontra a inscrição que está fazendo check-in
    db_inscricao = db.query(models.Inscricao).filter(
        models.Inscricao.id == presenca.inscricao_id
    ).first()

    if db_inscricao is None:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")

    # 2. Verifica se o check-in já foi feito para esta inscrição
    db_presenca_existente = db.query(models.Presenca).filter(
        models.Presenca.inscricao_id == presenca.inscricao_id
    ).first()
    
    if db_presenca_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in já realizado para esta inscrição"
        )

    # 3. Tudo certo, registra a presença
    db_presenca = models.Presenca(
        inscricao_id=db_inscricao.id,
        usuario_id=db_inscricao.usuario_id,
        evento_id=db_inscricao.evento_id
    )
    
    db.add(db_presenca)
    db.commit()
    db.refresh(db_presenca)
    
    # TODO: Disparar e-mail de "comparecimento (checkin)" (Sprint 3)
    # (chamar o servico_notificacoes)

    return db_presenca