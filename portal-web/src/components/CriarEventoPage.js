// portal-web/src/components/CriarEventoPage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Type, Save, Layout } from 'lucide-react';
import api from '../api';
import { buttonHoverTap } from '../App';

const CriarEventoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const eventoEditando = location.state?.eventoEditando;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_evento: ''
  });

  const [template, setTemplate] = useState('default');

  useEffect(() => {
    if (eventoEditando) {
      const dataFormatada = eventoEditando.data_evento
        ? new Date(eventoEditando.data_evento).toISOString().slice(0, 16)
        : '';

      setFormData({
        nome: eventoEditando.nome,
        descricao: eventoEditando.descricao || '',
        data_evento: dataFormatada
      });

      if (eventoEditando.template_certificado) {
        setTemplate(eventoEditando.template_certificado);
      }
    }
  }, [eventoEditando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.data_evento) {
      alert('Por favor, preencha o nome e a data do evento.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        data_evento: formData.data_evento,
        template_certificado: template
      };

      if (eventoEditando) {
        await api.patch(`/admin/eventos/${eventoEditando.id}`, payload);
        alert('Evento atualizado com sucesso!');
      } else {
        await api.post('/admin/eventos', payload);
        alert('Evento criado com sucesso!');
      }

      navigate('/eventos');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Ocorreu um erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '20px' }}>
      <motion.div
        className="login-card"
        style={{ maxWidth: '600px', width: '100%', textAlign: 'left' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        
        {/* Cabeçalho do Form */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
            <motion.button
              onClick={() => navigate('/eventos')}
              className="btn-logout"
              style={{ border: 'none', padding: '8px' }}
              {...buttonHoverTap}
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </motion.button>
            
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                {eventoEditando ? 'Você está editando um evento!' : 'Vamos criar um novo evento?'}
            </h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            {eventoEditando
              ? 'Atualize as informações abaixo.'
              : 'Preencha os dados para adicionar um novo evento ao calendário.'}
        </p>

        <form onSubmit={handleSubmit}>
          
          {/* Nome */}
          <div className="form-group input-with-icon">
            <label>Nome do Evento</label>
            <div style={{ position: 'relative' }}>
                <Type className="input-left-icon" size={18} />
                <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Workshop de Inovação"
                    required
                    autoFocus
                />
            </div>
          </div>

          {/* Data e Hora */}
          <div className="form-group input-with-icon">
            <label>Data e Hora</label>
            <div style={{ position: 'relative' }}>
                <Calendar className="input-left-icon" size={18} />
                <input
                    type="datetime-local"
                    name="data_evento"
                    value={formData.data_evento}
                    onChange={handleChange}
                    required
                />
            </div>
          </div>

          {/* Descrição */}
          <div className="form-group input-with-icon textarea-wrapper">
            <label>
              Descrição <span style={{fontWeight: 'normal', color: 'var(--text-secondary)'}}>(Opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
                <FileText className="input-left-icon" size={18} />
                <textarea
                    name="descricao"
                    rows={4}
                    value={formData.descricao}
                    onChange={handleChange}
                    placeholder="Detalhes sobre local, palestrantes, tópicos..."
                />
            </div>
          </div>

          {/* Template */}
          <div className="form-group input-with-icon">
            <label>Estilo do Certificado</label>
            <div style={{ position: 'relative' }}>
                <Layout className="input-left-icon" size={18} />
                <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                >
                    <option value="default">Corporativo (Padrão)</option>
                    <option value="tech">Tech / Inovação (Escuro)</option>
                    <option value="saude">Saúde & Bem-Estar (Clean)</option>
                    <option value="educacao">Acadêmico / Educação (Clássico)</option>
                </select>
            </div>
            <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-secondary)' }}>
                Isso define o layout do PDF gerado para os participantes.
            </small>
          </div>

          {/* Botão Salvar */}
          <motion.button
            type="submit"
            disabled={loading}
            className="btn-login"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}
            {...(!loading ? buttonHoverTap : {})}
          >
            {loading ? 'Salvando...' : <><Save size={18} /> {eventoEditando ? 'Salvar' : 'Publicar evento'}</>}
          </motion.button>

        </form>
      </motion.div>
    </div>
  );
};

export default CriarEventoPage;