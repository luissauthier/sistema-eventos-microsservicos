const express = require('express');
const app = express();
const PORT = 8004;

app.get('/', (req, res) => {
  res.send('Serviço de Notificações (Node.js) está online');
});

// Endpoint de envio de e-mail (placeholder)
app.post('/emails', (req, res) => {
  console.log("Recebida solicitação para POST /emails");
  // Lógica de envio de e-mail aqui (usando Nodemailer, etc.)
  res.status(202).json({ message: "Solicitação de e-mail recebida" });
});

app.listen(PORT, () => {
  console.log(`Serviço de Notificações rodando na porta ${PORT}`);
});