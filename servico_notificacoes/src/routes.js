// servico_notificacoes/src/routes.js
const { Router } = require("express");
const emailController = require("./controllers/emailController");

const router = Router();

// Rota principal de envio de e-mail
router.post("/emails", emailController.sendEmail);

// Health Check (usado pelo Docker/Kubernetes)
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "servico-notificacoes" });
});

module.exports = router;