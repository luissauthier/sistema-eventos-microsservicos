# Usar uma imagem base do Node.js
FROM node:20-alpine

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o package.json e package-lock.json (ou yarn.lock)
# Isso otimiza o cache do Docker, para não reinstalar tudo a cada build
COPY package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o resto do código da aplicação (isso será feito pelo docker-compose)
# No nosso caso, usaremos 'volumes' para espelhar o código.

COPY . .

# Expor a porta padrão do create-react-app
EXPOSE 3000

# Comando para iniciar a aplicação em modo de desenvolvimento
CMD ["npm", "start"]
