import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, X, Award, AlertTriangle } from 'lucide-react'; // Adicionei AlertTriangle
import { buttonHoverTap } from '../App';
import api from '../api';
import CertificateModal from './CertificateModal';

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
  const [showModal, setShowModal] = useState(false);
  const [currentCert, setCurrentCert] = useState(null);

  // Função para buscar os dados da API (substitui 'fetchData')
  const carregarInscricoes = async () => {
    try {
      setLoading(true);
      
      // 1. Busca as inscrições (com detalhes do evento)
      const inscResponse = await api.get('/inscricoes/me');
      setInscricoes(inscResponse.data);
      
      // 2. REMOVIDO: Não usamos mais dados mockados de presença
      
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
  }, []); // [] = Executa apenas uma vez

  // Função de Cancelar (API Real, agora chamando carregarInscricoes)
  const handleCancelarInscricao = async (id) => {
    // Confirmação antes de cancelar
    if (!window.confirm("Tem certeza que deseja cancelar sua inscrição?")) {
        return;
    }

    try {
        await api.patch(`/inscricoes/${id}/cancelar`, {
            justificativa: "Cancelado pelo usuário via portal"
        });

        alert("Inscrição cancelada com sucesso!");
        
        // Recarrega a lista para atualizar a tela
        carregarInscricoes();

    } catch (error) {
        console.error("Erro ao cancelar:", error);
        alert("Não foi possível cancelar a inscrição. Tente novamente.");
    }
  };
  
  // Função de Emitir Certificado (API Real)
  const handleEmitirCertificado = async (inscricao) => {
    // TODO: Esta lógica precisa ser definida.
    // O backend não parece ter uma rota de *emissão* para usuário (só admin)
    // A rota /certificados é para validar.
    alert("Funcionalidade de emissão/download ainda não implementada.");

    /* try {
      const response = await api.post('/certificados/emitir/me', { ... });
      alert(`Certificado emitido!`);
    } catch (err) {
      alert('Erro ao emitir. (Você precisa ter o check-in confirmado!)');
    }
    */
  };

  const handleVerCertificado = async (inscricao) => {
    try {
      // 1. Busca todos os certificados do usuário
      const response = await api.get('/certificados/me');
      const meusCertificados = response.data;

      // 2. Tenta encontrar o certificado deste evento
      const cert = meusCertificados.find(c => c.evento_id === inscricao.evento_id);

      if (cert) {
        setCurrentCert(cert);
        setShowModal(true);
      } else {
        alert("Certificado ainda não gerado pelo sistema. Se você já fez check-in, aguarde alguns minutos.");
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar certificado.');
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
      <h2>Minhas Inscrições</h2>
      {inscricoes.length === 0 ? (
        <p>Você ainda não se inscreveu em nenhum evento.</p>
      ) : (
        inscricoes.map(inscricao => {
          
          // === LÓGICA DE ESTADO (Lendo dados reais do Backend) ===
          const hasCheckin = inscricao.checkin_realizado === true;
          const status = inscricao.status.toLowerCase(); // 'ativa' ou 'cancelada'
          // =======================================================

          return (
            <motion.div 
              key={inscricao.id} 
              className="card-inscricao"
              // Adiciona uma classe se estiver cancelado para "apagar" o card
              style={{ opacity: status === 'cancelada' ? 0.6 : 1.0 }} 
              variants={itemVariants}
            >
              <h3>{inscricao.evento.nome}</h3>
              
              {/* === LÓGICA DE TAGS DE STATUS === */}
              {status === 'cancelada' ? (
                <span className="status-checkin" style={{backgroundColor: '#E5E7EB', color: '#4B5563', borderColor: '#D1D5DB'}}>
                  <AlertTriangle size={16} /> Inscrição Cancelada
                </span>
              ) : hasCheckin ? (
                <span className="status-checkin checkin-ok">
                  <CheckCircle size={16} /> Presença Registrada
                </span>
              ) : (
                <span className="status-checkin checkin-pendente">
                  <Clock size={16} /> Aguardando Check-in
                </span>
              )}

              {/* === AÇÕES DO CARD (Botões) === */}
              <div className="card-actions">
                
                {/* Botão de Cancelar: Só aparece se ATIVA e SEM CHECKIN */}
                {status === 'ativa' && !hasCheckin && (
                  <motion.button 
                    className="btn-cancelar-small"
                    onClick={() => handleCancelarInscricao(inscricao.id)}
                    {...buttonHoverTap}
                  >
                    <X size={14} /> Cancelar
                  </motion.button>
                )}
                
                {/* Botão de Certificado: Só aparece se TIVER CHECKIN */}
                {hasCheckin && (
                   <motion.button 
                    className="btn-certificado"
                    onClick={() => handleVerCertificado(inscricao)}
                    {...buttonHoverTap}
                  >
                    <Award size={14} /> Ver Certificado
                  </motion.button>
                )}

                {/* Se estiver cancelada, nenhum botão aparece */}
              </div>
              
            </motion.div>
          );
        })
      )}

      {showModal && (
        <CertificateModal 
          certificado={currentCert} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </motion.div>
  );
}

export default InscricoesPage;