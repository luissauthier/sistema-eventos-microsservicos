from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Serviço de Eventos está online"}