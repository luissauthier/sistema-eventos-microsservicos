import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <--- 1. Import do Router
import { CheckCircle, Clock, X, AlertTriangle, Download, Calendar, ArrowRight } from 'lucide-react';
import { buttonHoverTap } from '../App';
import api from '../api';

// Animações
const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function InscricoesPage() {
  const navigate = useNavigate(); // <--- 2. Hook de navegação
  
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregarInscricoes = async () => {
    try {
      setLoading(true);
      const inscResponse = await api.get('/inscricoes/me');
      setInscricoes(inscResponse.data);
    } catch (err) {
      setError('Falha ao carregar suas inscrições.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarInscricoes();
  }, []);

  const handleCancelarInscricao = async (id) => {
    if (!window.confirm("Tem certeza que deseja cancelar sua inscrição?")) {
        return;
    }
    try {
        await api.patch(`/inscricoes/${id}/cancelar`, { justificativa: "Portal Web" });
        alert("Inscrição cancelada.");
        carregarInscricoes();
    } catch (error) {
        alert("Erro ao cancelar. Tente novamente.");
    }
  };

  const handleAbrirCertificado = (inscricao) => {
    if (inscricao.certificado && inscricao.certificado.codigo_unico) {
      const baseUrl = api.defaults.baseURL || 'http://177.44.248.76';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const downloadUrl = `${cleanBase}/certificados/download/${inscricao.certificado.codigo_unico}`;
      window.open(downloadUrl, '_blank');
    } else {
      alert("O certificado está sendo gerado. Por favor, atualize a página (F5) e tente novamente.");
    }
  };

  if (loading) return <p className="loading-text" style={{textAlign: 'center', marginTop: '20px'}}>Carregando inscrições...</p>;
  if (error) return <p className="form-error">{error}</p>;

  return (
    <motion.div 
      className="lista-inscricoes"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="eventos-header" style={{ marginBottom: '24px', borderBottom: 'none' }}>
        <h2>Minhas Inscrições</h2>
      </div>
      
      {inscricoes.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
           <p>Você ainda não se inscreveu em nenhum evento.</p>
           
           {/* Botão de Ação para levar aos Eventos */}
           <motion.button
             className="btn-login"
             style={{ width: 'auto', padding: '8px 24px', fontSize: '0.9rem' }}
             onClick={() => navigate('/eventos')} // <--- 3. Redireciona para a aba certa
             {...buttonHoverTap}
           >
             Ver eventos disponíveis <ArrowRight size={16} style={{marginLeft: 8}}/>
           </motion.button>
        </div>
      ) : (
        <div className="lista-eventos" style={{ gridTemplateColumns: '1fr' }}> 
          {inscricoes.map(inscricao => {
            const hasCheckin = inscricao.checkin_realizado === true;
            const status = inscricao.status ? inscricao.status.toLowerCase() : 'ativa';
            const isCancelled = status === 'cancelada';
            
            return (
              <motion.div 
                key={inscricao.id} 
                className="card-inscricao"
                variants={itemVariants}
                style={isCancelled ? { backgroundColor: '#fff5f5', borderColor: '#feb2b2' } : {}}
              >
                {/* Coluna Esquerda: Info do Evento */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: isCancelled ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {inscricao.evento.nome}
                  </h3>
                  
                  <p className="data-evento">
                    <Calendar size={16} />
                    {new Date(inscricao.evento.data_evento).toLocaleDateString()}
                    {' • '}
                    {new Date(inscricao.evento.data_evento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  
                  {/* Tags de Status */}
                  <div className="status-container" style={{ marginBottom: 0 }}>
                    {isCancelled ? (
                      <span className="status-badge cancelado">
                        <AlertTriangle size={14} /> Inscrição Cancelada
                      </span>
                    ) : hasCheckin ? (
                      <span className="status-badge sucesso">
                        <CheckCircle size={14} /> Presença Confirmada
                      </span>
                    ) : (
                      <span className="status-badge pendente">
                        <Clock size={14} /> Aguardando Check-in
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Coluna Direita: Ações */}
                <div className="card-actions" style={{ marginTop: 0, flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                  
                  {status === 'ativa' && !hasCheckin && (
                    <motion.button 
                      className="btn-cancelar-small"
                      onClick={() => handleCancelarInscricao(inscricao.id)}
                      {...buttonHoverTap}
                      title="Cancelar minha participação"
                    >
                      <X size={16} /> Cancelar Inscrição
                    </motion.button>
                  )}
                  
                  {hasCheckin && (
                      <motion.button 
                      className="btn-certificado"
                      onClick={() => handleAbrirCertificado(inscricao)}
                      {...buttonHoverTap}
                    >
                      <Download size={18} strokeWidth={2.5} />
                      <span>Certificado</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default InscricoesPage;