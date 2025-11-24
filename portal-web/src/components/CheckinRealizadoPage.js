import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <--- 1. Import do Router
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../api';
import { buttonHoverTap } from '../App';

function CheckinRealizadoPage() { // <--- 2. Sem props
  const navigate = useNavigate(); // <--- 3. Instância do Hook
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const processarCheckin = async () => {
      // 1. Tenta pegar o token da URL ou do LocalStorage (se veio do login)
      const params = new URLSearchParams(window.location.search);
      let token = params.get('token');
      
      if (!token) {
         token = localStorage.getItem('pending_checkin_token');
      }

      if (!token) {
        setStatus('error');
        setMessage('Nenhum token de check-in encontrado.');
        return;
      }

      try {
        // 2. Chama a API
        const response = await api.post(`/checkin-qr/${token}`);
        
        // 3. Limpa pendências
        localStorage.removeItem('pending_checkin_token');
        
        // Limpa a URL visualmente para não ficar o token exposto (Opcional, mas bom para UX)
        window.history.replaceState({}, document.title, window.location.pathname);

        setStatus('success');
        setDados(response.data); // { message, inscricao_id, ... }
        
      } catch (err) {
        console.error(err);
        setStatus('error');
        const msg = err.response?.data?.detail || err.response?.data?.message || "Token inválido ou expirado.";
        setMessage(msg);
      }
    };

    processarCheckin();
  }, []);

  return (
    <div className="login-container" style={{ paddingTop: '40px' }}>
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: '450px' }}
      >
        
        {/* ESTADO: CARREGANDO */}
        {status === 'loading' && (
            <div className="text-center py-8">
                <Loader2 size={48} className="animate-spin mx-auto text-indigo-600 mb-4" />
                <h2 style={{color: 'var(--primary)'}}>Validando Check-in...</h2>
                <p style={{color: 'var(--text-secondary)'}}>Aguarde um momento.</p>
            </div>
        )}

        {/* ESTADO: SUCESSO */}
        {status === 'success' && (
            <div className="text-center py-4">
                <div className="mb-6 flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle size={64} className="text-green-600" />
                    </div>
                </div>
                <h2 style={{color: 'var(--primary)', marginBottom: '8px'}}>Presença Confirmada!</h2>
                <p style={{color: 'var(--text-secondary)', marginBottom: '32px'}}>
                    Seu check-in foi registrado com sucesso. Aproveite o evento.
                </p>
                
                <motion.button
                    className="btn-login"
                    onClick={() => navigate('/inscricoes')} // <--- 4. Navegação Sucesso
                    {...buttonHoverTap}
                >
                    Ver Minhas Inscrições <ArrowRight size={18} />
                </motion.button>
            </div>
        )}

        {/* ESTADO: ERRO */}
        {status === 'error' && (
            <div className="text-center py-4">
                <div className="mb-6 flex justify-center">
                    <div className="bg-red-100 p-4 rounded-full">
                        <XCircle size={64} className="text-red-600" />
                    </div>
                </div>
                <h2 style={{color: 'var(--danger)', marginBottom: '8px'}}>Falha no Check-in</h2>
                <p style={{color: 'var(--text-secondary)', marginBottom: '32px'}}>
                    {message}
                </p>
                
                <motion.button
                    className="btn-logout"
                    style={{width: '100%', justifyContent: 'center'}}
                    onClick={() => navigate('/eventos')} // <--- 5. Navegação Erro/Voltar
                    {...buttonHoverTap}
                >
                    Voltar para o Início
                </motion.button>
            </div>
        )}

      </motion.div>
    </div>
  );
}

export default CheckinRealizadoPage;