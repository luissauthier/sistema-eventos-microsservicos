const express = require('express');
const app = express();
app.use(express.json());

// A porta que definimos no docker-compose
const PORT = 8004; 

// Endpoint mockado do Sprint 0
app.post('/emails', (req, res) => {
  console.log('--- NOVO E-MAIL (MOCK) ---');
  console.log('Recebido em: ' + new Date().toLocaleString());
  console.log('Body:', req.body);
  console.log('---------------------------');
  
  res.status(200).json({ message: 'Email (mock) recebido!' });
});

app.listen(PORT, () => {
  console.log(`[ms-notificacoes] Mock rodando na porta ${PORT}`);
});