// app-local/teste-rede.js
const axios = require('axios');

console.log("--- INICIANDO TESTE DE CONEXÃO ---");
console.log("Tentando conectar em: http://localhost ...");

axios.get('http://localhost:80/eventos') // Tenta listar eventos (rota GET pública ou protegida)
  .then(response => {
    console.log("✅ SUCESSO! O servidor respondeu.");
    console.log("Status:", response.status);
  })
  .catch(error => {
    console.error("❌ FALHA DE CONEXÃO.");
    if (error.code === 'ECONNREFUSED') {
      console.error("MOTIVO: Ninguém está escutando na porta 8000.");
      console.error("DICA: Verifique se o Docker está rodando: 'docker-compose ps'");
    } else {
      console.error("ERRO:", error.message);
    }
  });