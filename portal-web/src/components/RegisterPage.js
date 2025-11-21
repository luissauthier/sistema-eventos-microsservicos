// portal-web/src/components/RegisterPage.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AtSign, ArrowRight } from 'lucide-react';
import { buttonHoverTap } from '../App';
import api from '../api';
import logoLight from '../nexstage_sem_fundo_escuro.svg';
import logoDark from '../nexstage_sem_fundo_branco.svg';

function RegisterPage({ setPagina, theme}) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/usuarios', {
        username,
        email,
        password,
        full_name: fullName,
      });
      
      alert('Cadastro realizado com sucesso! Faça login.');
      setPagina('login');

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Erro ao criar conta. Tente outro usuário/email.';
      setError(msg);
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
          <h2 style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '8px' }}>Crie sua conta</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Junte-se à plataforma e participe de eventos exclusivos
          </p>
        </div>

        <form onSubmit={handleRegister}>
          
          {/* Nome Completo */}
          <div className="form-group input-with-icon">
            <label>Nome Completo</label>
            <div style={{ position: 'relative' }}>
                <User className="input-left-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Seu nome completo" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
            </div>
          </div>

          {/* Username */}
          <div className="form-group input-with-icon">
            <label>Usuário</label>
            <div style={{ position: 'relative' }}>
                <AtSign className="input-left-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="seu.username" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
            </div>
          </div>

          {/* Email */}
          <div className="form-group input-with-icon">
            <label>E-mail</label>
            <div style={{ position: 'relative' }}>
                <Mail className="input-left-icon" size={18} />
                <input 
                  type="email" 
                  placeholder="seu@email.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          </div>

          {/* Senha */}
          <div className="form-group input-with-icon">
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
                <Lock className="input-left-icon" size={18} />
                <input 
                  type="password" 
                  placeholder="Mínimo 8 caracteres" 
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <motion.button 
            type="submit" 
            className="btn-login"
            disabled={loading}
            {...buttonHoverTap}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Criando conta...' : <>Cadastrar <ArrowRight size={18} /></>}
          </motion.button>

          <div className="form-switch">
            Já possui uma conta? 
            <button 
              type="button"
              onClick={() => setPagina('login')} 
              className="btn-link"
            >
              Faça login
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}

export default RegisterPage;