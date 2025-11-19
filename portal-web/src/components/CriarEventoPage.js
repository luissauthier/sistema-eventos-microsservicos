// src/pages/CriarEventoPage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, FileText, Type, Save } from 'lucide-react';
import api from '../api';
import { buttonHoverTap } from '../App';

const CriarEventoPage = ({ setPagina, eventoEditando }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_evento: ''
  });

  const [template, setTemplate] = useState('default');

  // Preenche o formulário se estiver editando
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

      setPagina('eventos');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Ocorreu um erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="conteudo">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >

        {/* Card de formulário reaproveitando .form-container */}
        <div className="form-container">
          <h2>
            <motion.button
              onClick={() => setPagina('eventos')}
              className="btn-voltar form-voltar"
              {...buttonHoverTap}
            >
              <ArrowLeft size={16} />
            </motion.button>
            {eventoEditando ? 'Editar Evento' : 'Criar Novo Evento'}
          </h2>

          <p style={{ 
            fontSize: 'var(--fs-small)', 
            color: 'var(--text-secondary)', 
            marginBottom: 'var(--space-6)' 
          }}>
            {eventoEditando
              ? 'Atualize as informações do evento abaixo.'
              : 'Preencha os campos para adicionar um novo evento ao calendário.'}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div className="form-group">
              <label>Nome do Evento</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Workshop de React Avançado"
                  required
                />
              </div>
            </div>

            {/* Data e Hora */}
            <div className="form-group">
              <label>Data e Hora</label>
              <div className="input-with-icon">
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
            <div className="form-group">
              <label>
                Descrição <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  (opcional)
                </span>
              </label>
              <div className="input-with-icon textarea-wrapper">
                <FileText className="input-left-icon" size={18} />
                <textarea
                  name="descricao"
                  rows={4}
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Detalhes sobre local, palestrantes, tópicos abordados..."
                />
              </div>
            </div>

            {/* Template de Certificado */}
            <div className="form-group">
              <label>Estilo do Certificado</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="default">Clássico (Azul/Univates)</option>
                <option value="dark">Dark Mode (Tecnologia)</option>
                <option value="minimal">Minimalista (P&B)</option>
              </select>
              <small style={{ 
                color: 'var(--text-secondary)', 
                fontSize: 'var(--fs-small)' 
              }}>
                Isso definirá o visual do certificado para todos os participantes.
              </small>
            </div>

            {/* Botão salvar reaproveitando .btn-primary */}
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary"
              {...(!loading ? buttonHoverTap : {})}
            >
              {loading ? (
                'Processando...'
              ) : (
                <>
                  <Save size={18} style={{ marginRight: 8 }} />
                  {eventoEditando ? 'Salvar Alterações' : 'Criar Evento'}
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CriarEventoPage;
