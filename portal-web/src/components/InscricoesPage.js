import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, X, AlertTriangle, Download, Calendar} from 'lucide-react'; // Adicionei AlertTriangle
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

// Componente "InscricoesPage" (Agora com dados reais)
function InscricoesPage() {
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Função para buscar os dados da API (substitui 'fetchData')
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

  // Executa o carregarInscricoes quando o componente carregar
  useEffect(() => {
    carregarInscricoes();
  }, []);

  // Função de Cancelar (API Real, agora chamando carregarInscricoes)
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
    // Verifica se o objeto certificado existe e tem o código
    if (inscricao.certificado && inscricao.certificado.codigo_unico) {
      
      // Pega a URL base da API (ex: http://localhost/)
      const baseUrl = api.defaults.baseURL || 'http://localhost';
      // Garante que não tenha barra duplicada
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      
      // Monta a URL direta para o endpoint de download
      const downloadUrl = `${cleanBase}/certificados/download/${inscricao.certificado.codigo_unico}`;
      
      // Abre em nova aba
      window.open(downloadUrl, '_blank');
    
    } else {
      // Se caiu aqui, o Auto-Repair ainda está rodando ou falhou
      alert("O certificado está sendo gerado. Por favor, atualize a página (F5) e tente novamente.");
    }
  };

  if (loading) return <p>A carregar inscrições...</p>;
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
        <p className="empty-state">
           Você ainda não se inscreveu em nenhum evento.
           <br/>
           <span style={{ fontSize: '0.9rem', marginTop: '8px', display: 'block' }}>
             Acesse a aba "Eventos" para começar.
           </span>
        </p>
      ) : (
        <div className="lista-eventos" style={{ gridTemplateColumns: '1fr' }}> {/* Lista vertical */}
          {inscricoes.map(inscricao => {
            const hasCheckin = inscricao.checkin_realizado === true;
            const status = inscricao.status ? inscricao.status.toLowerCase() : 'ativa';
            const isCancelled = status === 'cancelada';
            
            return (
              <motion.div 
                key={inscricao.id} 
                className="card-inscricao"
                variants={itemVariants}
                // Adicionamos estilo condicional para cancelado via style ou classe extra se preferir
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