import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App'; // Importa a animação
import axios from 'axios'; // Usamos axios puro aqui para o form-urlencoded

function LoginPage({ setPagina, setAuthToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // O endpoint /auth espera 'x-www-form-urlencoded'
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      // Chamada relativa para o Nginx
      const response = await axios.post('/auth', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Se funcionar, guarda o token e atualiza o App.js
      localStorage.setItem('access_token', response.data.access_token);
      setAuthToken(response.data.access_token);
      setPagina('eventos'); // Muda para a página de eventos

    } catch (err) {
      setError('Falha no login. Verifique o utilizador e a senha.');
      console.error(err);
    }
  };

  // O JSX é o mesmo que o Luís criou
  return (
    <div className="form-container">
      <h2>Entrar na Plataforma</h2>
      <form onSubmit={handleLogin}>
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
          <label>Senha:</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap}
        >
          Entrar
        </motion.button>
        {error && <p className="form-error">{error}</p>}
        <p className="form-switch">
          Não tem conta? 
          <button onClick={() => setPagina('register')} className="btn-link">
            Cadastre-se
          </button>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;