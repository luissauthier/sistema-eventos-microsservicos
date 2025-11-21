// portal-web/src/components/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, FileText, Save } from 'lucide-react'; // Ícones
import { buttonHoverTap } from '../App';
import api from '../api'; 

function ProfilePage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    cpf: '',
    telefone: '',
    endereco: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/usuarios/me');
        setFormData({
          full_name: response.data.full_name || '',
          email: response.data.email || '',
          cpf: response.data.cpf || '',
          telefone: response.data.telefone || '',
          endereco: response.data.endereco || ''
        });
      } catch (err) {
        setError('Falha ao carregar dados do perfil.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.patch('/usuarios/me', formData);
      setSuccess('Perfil atualizado com sucesso!');
      // Remove msg de sucesso após 3s
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Falha ao atualizar. Verifique se os dados são válidos.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return <p className="loading-text" style={{textAlign: 'center'}}>Carregando perfil...</p>;

  return (
    <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '600px', textAlign: 'left' }} // Ajuste específico para perfil
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
             width: '80px', height: '80px', backgroundColor: 'var(--bg-element)', 
             borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
             margin: '0 auto 16px auto'
          }}>
             <User size={40} color="var(--text-secondary)" />
          </div>
          <h2 style={{ marginBottom: '8px', color: 'var(--primary)' }}>Meu Perfil</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Mantenha seus dados atualizados para a emissão correta dos certificados.
          </p>
        </div>
        
        <form onSubmit={handleUpdate}>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div className="form-group input-with-icon md:col-span-2">
              <label>Nome completo</label>
              <div style={{ position: 'relative' }}>
                <User size={18} className="input-left-icon" />
                <input 
                  name="full_name" 
                  type="text" 
                  value={formData.full_name} 
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            {/* CPF */}
            <div className="form-group input-with-icon">
              <label>CPF</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} className="input-left-icon" />
                <input 
                  name="cpf" 
                  type="text" 
                  maxLength="14"
                  placeholder="000.000.000-00"
                  value={formData.cpf} 
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="form-group input-with-icon">
              <label>Telefone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} className="input-left-icon" />
                <input 
                  name="telefone" 
                  type="text" 
                  placeholder="(00) 90000-0000"
                  value={formData.telefone} 
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* E-mail (Read Only ou Editável) */}
          <div className="form-group input-with-icon">
            <label>E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} className="input-left-icon" />
              <input 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="form-group input-with-icon">
            <label>Endereço Completo</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} className="input-left-icon" />
              <input 
                name="endereco" 
                type="text" 
                placeholder="Rua, Número, Bairro, Cidade"
                value={formData.endereco} 
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Feedback */}
          {error && <p className="form-error">{error}</p>}
          {success && (
            <div className="status-badge sucesso" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: '16px' }}>
              Perfil atualizado com sucesso!
            </div>
          )}

          <motion.button 
            type="submit" 
            className="btn-login" // Reusa estilo do botão principal
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            {...buttonHoverTap}
          >
            {saving ? 'Salvando...' : <><Save size={18} /> Salvar</>}
          </motion.button>
          
        </form>
      </motion.div>
    </div>
  );
}

export default ProfilePage;