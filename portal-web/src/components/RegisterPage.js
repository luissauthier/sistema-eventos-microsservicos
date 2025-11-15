import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App';
import api from '../api'; // Usamos o nosso 'api.js' configurado

function RegisterPage({ setPagina }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Usamos o 'api' para a chamada JSON
      await api.post('/usuarios', {
        username: username,
        password: password,
        full_name: fullName,
        email: email
      });

      // Se o registo for bem-sucedido, manda para o login
      setPagina('login');

    } catch (err) {
      setError('Falha no registo. O utilizador ou e-mail pode já existir.');
      console.error(err);
    }
  };
  
  // O JSX é o mesmo, mas com 'username' adicionado para a nossa API
  return (
    <div className="form-container">
      <h2>Criar Conta</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Nome Completo:</label>
          <input 
            type="text" 
            placeholder="Seu nome completo" 
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
         <div className="form-group">
          <label>Username:</label>
          <input 
            type="text" 
            placeholder="seu.username" 
            required 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input 
            type="email" 
            placeholder="seu@email.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap}
        >
          Cadastrar
        </motion.button>
        {error && <p className="form-error">{error}</p>}
        <p className="form-switch">
          Já tem conta? 
          <button onClick={() => setPagina('login')} className="btn-link">
            Faça login
          </button>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;