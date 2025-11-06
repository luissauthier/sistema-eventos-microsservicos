# Usa uma imagem Python leve
FROM python:3.11-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo de dependências
COPY ./requirements.txt /app/requirements.txt

# Instala as dependências
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Copia o código-fonte
# (Usamos um volume no docker-compose, mas isso é bom para a build final)
COPY ./src /app

# Comando para rodar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]