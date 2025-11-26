import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '../api';
import { motion } from 'framer-motion';

const CheckinRealizadoPage = () => {
  const [status, setStatus] = useState('processando');
  const [mensagem, setMensagem] = useState('Validando sua presença...');
  
  // Ref para evitar dupla execução em React 18 Strict Mode
  const processedToken = React.useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processarCheckin = async () => {
      const params = new URLSearchParams(location.search);
      const tokenUrl = params.get('token');
      const tokenStorage = localStorage.getItem('pending_checkin_token');
      
      // Prioridade: URL > Storage
      const tokenFinal = tokenUrl || tokenStorage;

      // Se não tem token ou se já processamos ESTE token exato (evita loop)
      if (!tokenFinal || processedToken.current === tokenFinal) {
        if (!tokenFinal && status === 'processando') {
            setStatus('erro');
            setMensagem('Nenhum token encontrado. Leia o QR Code novamente.');
        }
        return;
      }

      // Marca como processado para não repetir
      processedToken.current = tokenFinal;
      
      // Reset visual para novo processamento
      setStatus('processando');
      setMensagem('Validando token...');

      try {
        // Limpa storage para não atrapalhar futuros logins
        localStorage.removeItem('pending_checkin_token');

        const response = await api.post(`/checkin-qr/${tokenFinal}`);
        const dados = response.data;

        if (dados.message === "Já registrado") {
            setStatus('warning');
            setMensagem('Você já realizou o check-in neste evento.');
        } else {
            setStatus('sucesso');
            setMensagem('Check-in confirmado com sucesso!');
        }
        
        // Limpa a URL silenciosamente para ficar bonito (remove o ?token=...)
        window.history.replaceState({}, '', '/checkin-confirmar');

      } catch (error) {
        console.error("Erro checkin:", error);
        setStatus('erro');
        
        const msgBackend = error.response?.data?.detail || error.response?.data?.message;
        if (msgBackend) {
             if (msgBackend.includes("cancelada")) {
                 setMensagem("Sua inscrição está CANCELADA. Contate a organização.");
             } else if (msgBackend.includes("inválido") || msgBackend.includes("expirado")) {
                 setMensagem("QR Code inválido ou expirado.");
             } else {
                 setMensagem(msgBackend);
             }
        } else {
            setMensagem('Não foi possível validar o check-in.');
        }
      }
    };

    processarCheckin();
  }, [location]); // Re-executa se a URL mudar (novo scan)

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-in fade-in zoom-in duration-300">
      <motion.div 
        key={status} // Força animação ao trocar status
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100"
      >
        {status === 'processando' && (
          <div className="py-8">
            <div className="flex justify-center mb-6">
              <Loader2 className="animate-spin text-indigo-600" size={64} />
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Processando...</h2>
            <p className="text-slate-500 text-sm">{mensagem}</p>
          </div>
        )}

        {status === 'sucesso' && (
          <div className="py-4">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Tudo Certo!</h2>
            <p className="text-slate-600 mb-8 font-medium">{mensagem}</p>
            <button onClick={() => navigate('/eventos')} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
              Meus Eventos
            </button>
          </div>
        )}

        {status === 'warning' && (
          <div className="py-4">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-amber-100 p-4">
                <AlertTriangle className="text-amber-600" size={48} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Atenção</h2>
            <p className="text-slate-600 mb-8 font-medium">{mensagem}</p>
            <button onClick={() => navigate('/eventos')} className="w-full border border-slate-300 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Voltar
            </button>
          </div>
        )}

        {status === 'erro' && (
          <div className="py-4">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="text-red-600" size={48} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Falha no Check-in</h2>
            <p className="text-red-600/90 mb-8 text-sm font-medium bg-red-50 p-3 rounded-lg">{mensagem}</p>
            <button onClick={() => navigate('/eventos')} className="w-full border border-slate-200 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CheckinRealizadoPage;
