FROM node:18-alpine
WORKDIR /app

# Instala o nodemon para hot-reload
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8004
CMD ["nodemon", "index.js"]