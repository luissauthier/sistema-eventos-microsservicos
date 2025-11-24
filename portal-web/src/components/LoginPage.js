// portal-web/src/components/LoginPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { buttonHoverTap } from '../App'; 
import api from '../api';

import logoLight from '../nexstage_sem_fundo_escuro.svg';
import logoDark from '../nexstage_sem_fundo_branco.svg';

function LoginPage({ onLogin, theme }) {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = res.data;
      localStorage.setItem('access_token', access_token);

      const userRes = await api.get('/usuarios/me');
      const userData = userRes.data;
      localStorage.setItem('user', JSON.stringify(userData));

      onLogin(userData);

      // Se houver um token de check-in pendente (leu QR code deslogado), vai para lá.
      // Caso contrário, vai para a home (Eventos).
      if (localStorage.getItem('pending_checkin_token')) {
          navigate('/checkin-confirmar');
      } else {
          navigate('/eventos');
      }

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
              className="Login-Register-logo" 
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
              placeholder="Seu usuário"
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
              onClick={() => navigate('/register')} 
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