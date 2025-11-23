FROM node:18-alpine

WORKDIR /app

# Instala o nodemon globalmente (útil para desenvolvimento)
RUN npm install -g nodemon

# Copia apenas os arquivos de dependência primeiro (Melhora o cache do Docker)
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies para o nodemon funcionar)
RUN npm install

# Copia o restante do código (incluindo a pasta src/)
COPY . .

EXPOSE 8004

# ALTERAÇÃO PRINCIPAL:
# Aponta para o script 'dev' do package.json ou direto para o caminho correto
CMD ["npm", "run", "dev"]