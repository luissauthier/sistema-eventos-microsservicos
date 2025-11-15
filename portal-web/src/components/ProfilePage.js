import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App';
import api from '../api'; // O nosso Axios configurado

function ProfilePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Carregar dados atuais do utilizador
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/usuarios/me');
        setFullName(response.data.full_name || ''); // Usa o nome completo ou string vazia
        setEmail(response.data.email || ''); // Usa o e-mail ou string vazia
        setLoading(false);
      } catch (err) {
        setError('Falha ao carregar dados do perfil.');
        console.error(err);
        setLoading(false);
      }
    };
    fetchUserData();
  }, []); // [] = Executa apenas uma vez

  // 2. Enviar atualização (PATCH)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.patch('/usuarios/me', {
        full_name: fullName,
        email: email
      });
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      setError('Falha ao atualizar o perfil. O e-mail pode já estar em uso.');
      console.error(err);
    }
  };

  if (loading) return <p>A carregar perfil...</p>;

  // Mantém a identidade visual do form-container
  return (
    <div className="form-container" style={{ maxWidth: '500px' }}>
      <h2>Meu Perfil</h2>
      <p>Complete ou atualize os seus dados.</p>
      <form onSubmit={handleUpdate}>
        <div className="form-group">
          <label>Nome Completo:</label>
          <input 
            type="text" 
            placeholder="Seu nome completo" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
        
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap}
        >
          Salvar Alterações
        </motion.button>
        
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
      </form>
    </div>
  );
}

export default ProfilePage;