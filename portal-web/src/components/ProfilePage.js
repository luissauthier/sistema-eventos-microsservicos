import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App';
import api from '../api'; 

function ProfilePage() {
  // Estados para todos os campos do modelo atualizado
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    cpf: '',
    telefone: '',
    endereco: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Carregar dados
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/usuarios/me');
        // Preenche o estado com o que vier da API ou string vazia
        setFormData({
          full_name: response.data.full_name || '',
          email: response.data.email || '',
          cpf: response.data.cpf || '',
          telefone: response.data.telefone || '',
          endereco: response.data.endereco || ''
        });
        setLoading(false);
      } catch (err) {
        setError('Falha ao carregar dados do perfil.');
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // 2. Atualizar dados
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Envia apenas o que foi alterado ou tudo (PUT/PATCH)
      await api.patch('/usuarios/me', formData);
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      setError('Falha ao atualizar. Verifique se o e-mail ou CPF já estão em uso.');
    }
  };

  // Helper para atualizar estado
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return <p className="text-center mt-10">A carregar perfil...</p>;

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Meu Perfil</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
        Mantenha seus dados atualizados para a emissão correta dos certificados.
      </p>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        
        {/* Dados Básicos */}
        <div className="form-group">
          <label>Nome Completo</label>
          <input 
            name="full_name" 
            type="text" 
            value={formData.full_name} 
            onChange={handleChange}
            placeholder="Ex: João da Silva"
          />
        </div>

        <div className="form-group">
          <label>E-mail</label>
          <input 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange}
            required
          />
        </div>

        {/* Novos Campos (Layout em Grid para ficar profissional) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>CPF</label>
            <input 
              name="cpf" 
              type="text" 
              maxLength="14"
              placeholder="000.000.000-00"
              value={formData.cpf} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input 
              name="telefone" 
              type="text" 
              placeholder="(00) 90000-0000"
              value={formData.telefone} 
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Endereço Completo</label>
          <input 
            name="endereco" 
            type="text" 
            placeholder="Rua, Número, Bairro, Cidade"
            value={formData.endereco} 
            onChange={handleChange}
          />
        </div>
        
        <motion.button 
          type="submit" 
          className="btn-primary"
          style={{ width: '100%', marginTop: '10px' }}
          {...buttonHoverTap}
        >
          Salvar Alterações
        </motion.button>
        
        {error && <p className="form-error text-center">{error}</p>}
        {success && <p className="form-success text-center">{success}</p>}
      </form>
    </div>
  );
}

export default ProfilePage;