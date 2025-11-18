import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, Plus, Edit2, QrCode } from 'lucide-react'; // <--- 1. Importei Plus
import { buttonHoverTap } from '../App';
import api from '../api';

// Animações (mantidas do original)
const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// 2. Recebemos setPagina nas props
function EventosPage({ setPagina, setEventoEditando, setEventoGerenciando, user }) { 
  const [eventos, setEventos] = useState([]);
  const [inscricoesIds, setInscricoesIds] = useState(new Set());  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState(null);

  const handleCheckinQr = (evento) => {
    setEventoGerenciando(evento);
    setPagina('checkin-qr');
  };
  
  const isAdmin = user && user.is_admin === true;

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // A. Busca Eventos
        const responseEventos = await api.get('/eventos');
        setEventos(responseEventos.data);

        // B. Tenta buscar inscrições
        try {
          const responseInscricoes = await api.get('/inscricoes/me');
          
          // FILTRO IMPORTANTE: Só consideramos inscrito se o status for 'ativa'
          // Usamos toLowerCase() para garantir, pois seu banco salvou 'CANCELADA' (maiúsculo)
          const inscricoesAtivas = responseInscricoes.data.filter(
              insc => insc.status && insc.status.toLowerCase() === 'ativa'
          );

          const ids = new Set(inscricoesAtivas.map(insc => insc.evento_id));
          setInscricoesIds(ids);
        } catch (authErr) {
          console.log("Visitante ou sem inscrições.");
        }

      } catch (err) {
        setError('Falha ao carregar eventos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []); 

  const handleEditar = (evento) => {
    setEventoEditando(evento); // Salva o evento no estado do App
    setPagina('criar-evento'); // Navega para o formulário
  };

  const handleNovo = () => {
    setEventoEditando(null);
    setPagina('criar-evento');
  };

  const handleInscricao = async (evento) => {
    try {
      await api.post('/inscricoes', {
        evento_id: evento.id,
        nome_evento: evento.nome
      });
      
      const novosIds = new Set(inscricoesIds);
      novosIds.add(evento.id);
      setInscricoesIds(novosIds);

      alert('Inscrição realizada com sucesso!');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('Você precisa estar logado para se inscrever.');
      } else {
        alert('Erro ao realizar inscrição. Talvez já esteja inscrito?');
        console.error(err);
      }
    }
  };

  if (loading) return <p>A carregar eventos...</p>;
  if (error) return <p className="form-error">{error}</p>;

  const isSelecionadoInscrito = eventoSelecionado ? inscricoesIds.has(eventoSelecionado.id) : false;

  return (
    <>
      {eventoSelecionado ? (
        // === Detalhes do Evento ===
        <motion.div 
          className="evento-detalhe"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button 
            onClick={() => setEventoSelecionado(null)} 
            className="btn-voltar"
            {...buttonHoverTap}
          >
            <ArrowLeft size={16} /> Voltar para a lista
          </motion.button>
          
          <h2>{eventoSelecionado.nome}</h2>
          <p><strong>Data:</strong> {new Date(eventoSelecionado.data_evento).toLocaleString()}</p>
          <p>{eventoSelecionado.descricao}</p>
          
          <motion.button 
            className="btn-inscrever"
            style={{ 
                backgroundColor: isSelecionadoInscrito ? '#10B981' : '', 
                cursor: isSelecionadoInscrito ? 'default' : 'pointer' 
            }}
            onClick={() => !isSelecionadoInscrito && handleInscricao(eventoSelecionado)}
            disabled={isSelecionadoInscrito}
            {...(!isSelecionadoInscrito ? buttonHoverTap : {})}
          >
            {isSelecionadoInscrito ? (
                <>Inscrito com sucesso <span style={{marginLeft: 8}}>✓</span></>
            ) : (
                <>Inscrever-se agora <ArrowRight size={16} /></>
            )}
          </motion.button>
        </motion.div>
      ) : (
        // === Lista de Eventos ===
        <motion.div 
          className="lista-eventos"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 3. CABEÇALHO FLEX (Título + Botão Admin) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Eventos Disponíveis</h2>
            
            {isAdmin && (
              <motion.button
                onClick={handleNovo}
                // Estilos inline para garantir o visual bonito sem depender de classes quebradas
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px', 
                  fontSize: '0.9rem',
                  backgroundColor: '#4F46E5', // Cor roxa do tema
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                }}
                {...buttonHoverTap}
              >
                <Plus size={18} /> Novo Evento
              </motion.button>
            )}
          </div>

          {eventos.map(evento => {
            const jaInscrito = inscricoesIds.has(evento.id);

            return (
                <motion.div 
                  key={evento.id} 
                  className="card-evento"
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                >
                  <h3>{evento.nome}</h3>
                  <p><strong>Data:</strong> {new Date(evento.data_evento).toLocaleDateString()}</p>

                  {isAdmin && (
                    <motion.button
                        className="btn-admin"
                        onClick={() => handleCheckinQr(evento)}
                        {...buttonHoverTap}
                    >
                        <QrCode size={14} /> Gerar QR Check-in
                    </motion.button>
                  )}
                  
                  {jaInscrito && (
                      <p style={{ color: '#10B981', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          ✓ Você já está inscrito
                      </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <motion.button 
                      onClick={() => setEventoSelecionado(evento)}
                      {...buttonHoverTap}>Ver Detalhes
                    </motion.button>
                    {isAdmin && (
                          <motion.button
                              onClick={() => handleEditar(evento)}
                              className="btn-secondary" // Pode criar essa classe ou usar inline
                              style={{ 
                                  backgroundColor: '#F3F4F6', 
                                  color: '#4B5563', 
                                  border: '1px solid #E5E7EB',
                                  padding: '0 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                              }}
                              title="Editar Evento"
                              {...buttonHoverTap}
                          >
                              <Edit2 size={16} />
                          </motion.button>
                      )}
                  </div>
                </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
}

export default EventosPage;