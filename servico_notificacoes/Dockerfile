# Usa uma imagem Node.js leve
FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia o código-fonte
COPY ./src /app

# Expõe a porta interna
EXPOSE 8004

# Comando para rodar a aplicação
CMD ["npm", "start"]