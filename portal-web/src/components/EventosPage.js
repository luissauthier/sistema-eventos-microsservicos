import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
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

function EventosPage() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState(null);

  // NOTA: A lógica de 'inscricoes' e 'checkins' foi movida para
  // o componente 'InscricoesPage' para simplificar.
  // Vamos focar aqui em listar e permitir a inscrição.

  // 1. Buscar Eventos da API
  useEffect(() => {
    const fetchEventos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/eventos');
        setEventos(response.data);
      } catch (err) {
        setError('Falha ao carregar eventos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventos();
  }, []); // [] = Executa apenas uma vez

  // 2. Lógica de Inscrição (API Real)
  const handleInscricao = async (evento) => {
    try {
      await api.post('/inscricoes', {
        evento_id: evento.id,
        nome_evento: evento.nome // O nosso backend de certificados precisa disto
      });
      alert('Inscrição realizada com sucesso!');
      // Idealmente, deveríamos atualizar o estado 'inscricoes'
      // Mas por agora, a API registou.
      setEventoSelecionado(null); // Fecha o detalhe
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('Você precisa estar logado para se inscrever.');
      } else {
        alert('Erro ao realizar inscrição. Talvez já esteja inscrito?');
        console.error(err);
      }
    }
  };

  // A lógica de cancelamento está no 'InscricoesPage'

  if (loading) return <p>A carregar eventos...</p>;
  if (error) return <p className="form-error">{error}</p>;

  // JSX (Mantido do original)
  return (
    <>
      {eventoSelecionado ? (
        // Detalhes do Evento
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
          
          {/* TODO: Lógica de 'isInscrito' precisa ser implementada */}
          <motion.button 
            className="btn-inscrever" 
            onClick={() => handleInscricao(eventoSelecionado)}
            {...buttonHoverTap}
          >
            Inscrever-se agora <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      ) : (
        // Lista de Eventos
        <motion.div 
          className="lista-eventos"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <h2>Eventos Disponíveis</h2>
          {eventos.map(evento => (
            <motion.div 
              key={evento.id} 
              className="card-evento"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <h3>{evento.nome}</h3>
              <p><strong>Data:</strong> {new Date(evento.data_evento).toLocaleString()}</p>
              <motion.button 
                onClick={() => setEventoSelecionado(evento)}
                {...buttonHoverTap}
              >
                Ver Detalhes
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

export default EventosPage;