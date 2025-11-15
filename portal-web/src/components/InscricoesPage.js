import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, X, Award } from 'lucide-react';
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
  const [presencas, setPresencas] = useState([]); // Lista de IDs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Função para buscar os dados da API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Busca as inscrições (com detalhes do evento)
      const inscResponse = await api.get('/inscricoes/me');
      setInscricoes(inscResponse.data);
      
      // 2. TODO: Buscar as presenças do usuário
      // O backend ainda não tem um endpoint 'GET /presencas/me'
      // Por enquanto, vamos manter mockado:
      setPresencas([1]); // Assumindo check-in para inscrição 1
      
    } catch (err) {
      setError('Falha ao carregar suas inscrições.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Executa o fetchData quando o componente carregar
  useEffect(() => {
    fetchData();
  }, []); // [] = Executa apenas uma vez

  // Função de Cancelar (API Real)
  const handleCancelarInscricao = async (inscricaoId) => {
    if (window.confirm("Tem a certeza que quer cancelar esta inscrição?")) {
      try {
        await api.delete(`/inscricoes?id=${inscricaoId}`);
        // Atualiza a lista local removendo a inscrição
        setInscricoes(inscricoes.filter(insc => insc.id !== inscricaoId));
        alert('Inscrição cancelada.');
      } catch (err) {
        alert('Erro ao cancelar inscrição. (Talvez já tenha check-in?)');
        console.error(err);
      }
    }
  };
  
  // Função de Emitir Certificado (API Real)
  const handleEmitirCertificado = async (inscricao) => {
    try {
      const response = await api.post('/certificados', {
        evento_id: inscricao.evento.id,
        nome_evento: inscricao.evento.nome
      });
      alert(`Certificado emitido! Código: ${response.data.codigo_autenticacao}`);
    } catch (err) {
      alert('Erro ao emitir. (Você precisa ter o check-in confirmado!)');
      console.error(err);
    }
  };
  
  // Helper para verificar presença (ainda mockado)
  const hasCheckin = (inscricaoId) => presencas.includes(inscricaoId);

  if (loading) return <p>A carregar inscrições...</p>;
  if (error) return <p className="form-error">{error}</p>;

  // JSX (Mantido do original, mas com dados reais)
  return (
    <motion.div 
      className="lista-inscricoes"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2>Minhas Inscrições</h2>
      {inscricoes.length === 0 ? (
        <p>Você ainda não se inscreveu em nenhum evento.</p>
      ) : (
        inscricoes.map(inscricao => (
          <motion.div 
            key={inscricao.id} 
            className="card-inscricao"
            variants={itemVariants}
          >
            <h3>{inscricao.evento.nome}</h3>
            
            {hasCheckin(inscricao.id) ? (
              <span className="status-checkin checkin-ok">
                <CheckCircle size={16} /> Presença Registrada
              </span>
            ) : (
              <span className="status-checkin checkin-pendente">
                <Clock size={16} /> Aguardando Check-in
              </span>
            )}

            {/* Ações do Card */}
            <div className="card-actions">
              {/* Botão de Cancelar */}
              {!hasCheckin(inscricao.id) && (
                <motion.button 
                  className="btn-cancelar-small"
                  onClick={() => handleCancelarInscricao(inscricao.id)}
                  {...buttonHoverTap}
                >
                  <X size={14} /> Cancelar
                </motion.button>
              )}
              
              {/* Botão de Emitir Certificado (Caso 3) */}
              {hasCheckin(inscricao.id) && (
                 <motion.button 
                  className="btn-certificado"
                  onClick={() => handleEmitirCertificado(inscricao)}
                  {...buttonHoverTap}
                >
                  <Award size={14} /> Emitir Certificado
                </motion.button>
              )}
            </div>
            
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

export default InscricoesPage;