// portal-web/src/components/LoginPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App'; 
import api from '../api';
import logoLight from '../nexstage_sem_fundo_escuro.svg';
import logoDark from '../nexstage_sem_fundo_branco.svg';

function LoginPage({ onLogin, setPagina, theme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth', 
        new URLSearchParams({ username, password }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);

      const userResp = await api.get('/usuarios/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const user = userResp.data;
      localStorage.setItem('user', JSON.stringify(user));

      onLogin(user);

    } catch (err) {
      console.error(err);
      setError('Usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* CABEÇALHO DO CARD */}
        <div style={{ marginBottom: '24px' }}>
          <div className="logo-container">
            {/* 2. Lógica de troca baseada no tema */}
            <img 
              src={theme === 'light' ? logoLight : logoDark} 
              alt="NexStage" 
              className="Login-Rgister-logo" 
            />
          </div>
          <h2 style={{ color: 'var(--primary)', fontWeight: '700' }}>Bem-vindo(a)</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Entre para acessar seus eventos e certificados
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Usuário</label>
            <input 
              type="text" 
              // CORREÇÃO 2: Placeholder focado no usuário final
              placeholder="seu.email@exemplo.com" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="Sua senha de acesso" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <motion.button 
            type="submit" 
            className="btn-login"
            disabled={loading}
            {...buttonHoverTap}
          >
            {loading ? 'Entrando...' : 'Entrar na Plataforma'}
          </motion.button>

          <div className="form-switch">
            Ainda não tem cadastro? 
            <button 
              type="button"
              onClick={() => setPagina('register')} 
              className="btn-link"
            >
              Criar conta
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default LoginPage;