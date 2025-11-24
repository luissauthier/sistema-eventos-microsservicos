import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X, Plus, Edit2, QrCode, Calendar, Check } from 'lucide-react';
import { buttonHoverTap } from '../App';
import api from '../api';
import MonitoramentoAtendentes from './MonitoramentoAtendentes';

// Animações
const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function EventosPage({ user }) { 
  const navigate = useNavigate();
  
  const [eventos, setEventos] = useState([]);
  const [inscricoesIds, setInscricoesIds] = useState(new Set());  
  const [loading, setLoading] = useState(true);
  
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  
  // Estado para o Modal de QR Code
  const [qrModal, setQrModal] = useState(null);

  const isAdmin = user && user.is_admin === true;

  useEffect(() => {
    carregarDados();
  }, []); 

  const carregarDados = async () => {
    try {
      setLoading(true);
      const res = await api.get('/eventos');
      setEventos(res.data);

      try {
        const resInsc = await api.get('/inscricoes/me');
        if (Array.isArray(resInsc.data)) {
             const ativas = resInsc.data.filter(i => i.status?.toLowerCase() === 'ativa');
             setInscricoesIds(new Set(ativas.map(i => i.evento_id)));
        }
      } catch (e) { /* Ignora se não logado */ }

    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarQrCode = async (evento) => {
    try {
      const response = await api.post('/admin/checkin/generate', {
        evento_id: evento.id,
        duracao_minutos: 60
      });

      const qrUrl = response.data.url_publica;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;

      setQrModal({
        eventoNome: evento.nome,
        imageUrl: qrImageUrl,
        token: qrUrl
      });

    } catch (error) {
      alert("Erro ao gerar token. Verifique permissões.");
      console.error(error);
    }
  };

  const handleInscricao = async (evento) => {
    try {
      await api.post('/inscricoes', { evento_id: evento.id });
      setInscricoesIds(prev => new Set(prev).add(evento.id));
      alert('Inscrição realizada com sucesso!');
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Você precisa fazer login para se inscrever.');
      } else {
        alert('Erro ao processar inscrição.');
      }
    }
  };

  // <--- Navegação para Edição (passando estado via Router)
  const handleEditar = (evento) => {
    navigate('/criar-evento', { state: { eventoEditando: evento } });
  };

  // <--- Navegação para Novo Evento
  const handleNovo = () => {
    navigate('/criar-evento');
  };

  if (loading) return <p className="loading-text" style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Carregando eventos...</p>;

  return (
    <>
      {/* === MODAL DE QR CODE (Admin) === */}
      {qrModal && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <button className="btn-close-modal" onClick={() => setQrModal(null)}>
              <X size={20} />
            </button>
            
            <h3>Check-in: {qrModal.eventoNome}</h3>
            
            <div className="qr-container">
              <img src={qrModal.imageUrl} alt="QR Code" />
            </div>
            
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
              Peça aos participantes para lerem este código.
            </p>
            <small className="token-display">Token: {qrModal.token}</small>
          </motion.div>
        </div>
      )}

      {eventoSelecionado ? (
        // === VISÃO DE DETALHES (Refatorada) ===
        <motion.div 
          className="evento-detalhe" 
          style={{ padding: 0, overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          
          {/* TOPO: Cabeçalho */}
          <div style={{ 
              padding: '32px', 
              backgroundColor: 'var(--bg-element)', 
              borderBottom: '1px solid var(--border-color)' 
          }}>
             <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <motion.button 
                    onClick={() => setEventoSelecionado(null)} 
                    className="btn-back-icon"
                    style={{ backgroundColor: 'white' }}
                    {...buttonHoverTap}
                    title="Voltar"
                  >
                    <ArrowLeft size={20} />
                  </motion.button>
                  
                  {/* Badge de Data */}
                  <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      backgroundColor: 'white', padding: '6px 12px', 
                      borderRadius: '100px', border: '1px solid var(--border-color)',
                      color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem'
                  }}>
                      <Calendar size={16} />
                      {new Date(eventoSelecionado.data_evento).toLocaleDateString()} 
                      <span style={{color: 'var(--border-color)'}}>|</span> 
                      {new Date(eventoSelecionado.data_evento).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
             </div>
             
             <h2 style={{ 
                 fontSize: '2rem', margin: '0', lineHeight: '1.2', 
                 color: 'var(--primary)', fontWeight: '800' 
             }}>
                {eventoSelecionado.nome}
             </h2>
          </div>
          
          {/* CORPO: Conteúdo Principal */}
          <div style={{ padding: '40px' }}>
             <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                 <div style={{ width: '4px', height: '40px', backgroundColor: 'var(--accent)', borderRadius: '2px' }}></div>
                 <div>
                     <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Sobre o Evento</span>
                     <span style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)' }}>Detalhes e agenda</span>
                 </div>
             </div>
          
             <div className="descricao-evento" style={{ 
                 backgroundColor: 'transparent', padding: 0, border: 'none', 
                 fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8' 
             }}>
                {eventoSelecionado.descricao || (
                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Nenhuma descrição fornecida pela organização.</span>
                )}
             </div>
             
             <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '32px', textAlign: 'right' }}>
                <motion.button 
                  className="btn-login"
                  style={{ 
                      width: 'auto', paddingLeft: '32px', paddingRight: '32px', 
                      display: 'inline-flex', marginLeft: 'auto',
                      backgroundColor: inscricoesIds.has(eventoSelecionado.id) ? 'var(--success)' : 'var(--primary)'
                  }}
                  disabled={inscricoesIds.has(eventoSelecionado.id)}
                  onClick={() => handleInscricao(eventoSelecionado)}
                  {...(!inscricoesIds.has(eventoSelecionado.id) ? buttonHoverTap : {})}
                >
                  {inscricoesIds.has(eventoSelecionado.id) ? (
                      <>
                        <Check size={20} /> 
                        <span>Inscrição Confirmada</span>
                      </>
                  ) : (
                      <>
                        <span>Confirmar Presença</span>
                        <ArrowRight size={20} />
                      </>
                  )}
                </motion.button>
             </div>
          </div>
        </motion.div>
      ) : (
        // === VISÃO DE LISTA ===
        <div>
          <div className="eventos-header">
            <h2>Eventos</h2>

            {isAdmin && (
              <motion.button
                onClick={handleNovo}
                className="btn-novo-evento"
                {...buttonHoverTap}
              >
                <Plus size={18} />
                <span>Evento</span>
              </motion.button>
            )}
          </div>

          <motion.div 
            className="lista-eventos"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {eventos.length === 0 && (
              <p className="empty-state">Nenhum evento encontrado no momento.</p>
            )}

            {eventos.map(evento => {
              const jaInscrito = inscricoesIds.has(evento.id);

              return (
                <motion.div 
                  key={evento.id} 
                  className="card-evento"
                  variants={itemVariants}
                >
                  <div>
                    <h3>{evento.nome}</h3>
                    <p className="data-evento">
                      <Calendar size={14} />
                      {new Date(evento.data_evento).toLocaleDateString()}
                    </p>
                    
                    {jaInscrito && (
                      <div style={{ marginBottom: '16px' }}>
                        <span className="status-badge sucesso">
                          <Check size={12} /> Você já está inscrito
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card-actions-row">
                    {/* Botão Detalhes */}
                    <motion.button 
                      className="btn-detalhes"
                      onClick={() => setEventoSelecionado(evento)}
                      {...buttonHoverTap}
                    >
                      Ver detalhes
                    </motion.button>

                    {/* Ações de Admin */}
                    {isAdmin && (
                      <>
                        <motion.button
                          className="btn-admin-qr"
                          onClick={() => handleGerarQrCode(evento)}
                          title="Gerar QR Code"
                          {...buttonHoverTap}
                        >
                          <QrCode size={16} />
                        </motion.button>

                        <motion.button
                          className="btn-icon-secondary"
                          onClick={() => handleEditar(evento)}
                          title="Editar"
                          {...buttonHoverTap}
                        >
                          <Edit2 size={16} />
                        </motion.button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
      
      {/* === MONITORAMENTO === */}
      {isAdmin && !eventoSelecionado && (
        <div className="mb-8" style={{ marginTop: '40px' }}>
           <MonitoramentoAtendentes />
        </div>
      )}
    </>
  );
}

export default EventosPage;