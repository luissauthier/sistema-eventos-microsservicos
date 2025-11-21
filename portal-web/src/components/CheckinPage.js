// portal-web/src/components/CheckinPage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, QrCode, ArrowLeft, Printer, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import { buttonHoverTap } from '../App';

// Função auxiliar para formatar data
const formatExpiration = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

function CheckinPage({ setPagina, evento }) {
  const eventoId = evento?.id;
  const eventoNome = evento?.nome || "Evento Desconhecido";
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer de contagem regressiva
  useEffect(() => {
    if (!tokenData || !tokenData.data_expiracao) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiration = new Date(tokenData.data_expiracao).getTime();
      const diff = Math.max(0, Math.floor((expiration - now) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenData]);

  useEffect(() => { if (eventoId) handleGenerateToken(); }, [eventoId]);

  const handleGenerateToken = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    setTokenData(null);

    try {
      const response = await api.post('/admin/checkin/generate', {
        evento_id: eventoId,
        duracao_minutos: duracaoMinutos
      });
      setTokenData(response.data);
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar token de acesso.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!eventoId) return <p className="empty-state">Selecione um evento primeiro.</p>;

  return (
    <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '20px' }}>
      <motion.div 
        className="login-card"
        style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
           <motion.button 
             onClick={() => setPagina('eventos')} 
             className="btn-logout" 
             style={{ border: 'none', padding: '8px' }}
             {...buttonHoverTap}
             title="Voltar"
           >
             <ArrowLeft size={20} />
           </motion.button>
           <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary)' }}>Auto Check-in</h2>
           <div style={{ width: '36px' }}></div>
        </div>

        <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.5rem' }}>{eventoNome}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Posicione esta tela na entrada do evento para auto-atendimento.
            </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'end', marginBottom: '32px' }}>
            <div className="form-group" style={{ marginBottom: 0, textAlign: 'left', width: '120px' }}>
                <label style={{ fontSize: '0.75rem' }}>Duração (min)</label>
                <input 
                    type="number" 
                    min="10" max="240" 
                    value={duracaoMinutos} 
                    onChange={e => setDuracaoMinutos(parseInt(e.target.value))}
                    style={{ textAlign: 'center', fontWeight: 'bold' }}
                />
            </div>
            <motion.button
                onClick={handleGenerateToken}
                disabled={loading}
                className="btn-login"
                style={{ width: 'auto', height: '42px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)' }}
                {...buttonHoverTap}
            >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? '...' : 'Renovar Token'}
            </motion.button>
        </div>

        {error && <div className="form-error" style={{marginBottom: '20px'}}>{error}</div>}

        {tokenData && (
            <div style={{ 
                backgroundColor: timeLeft > 0 ? '#f8fafc' : '#fff1f2', 
                border: `2px dashed ${timeLeft > 0 ? 'var(--border-color)' : 'var(--danger)'}`,
                borderRadius: '16px',
                padding: '40px 20px',
                position: 'relative',
                transition: 'all 0.3s ease'
            }}>
                
                {timeLeft > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                            background: 'white', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            boxShadow: 'var(--shadow-md)',
                            border: '1px solid var(--border-color)',
                            marginBottom: '24px'
                        }}>
                            <QRCodeSVG value={tokenData.url_publica} size={240} level="H" />
                        </div>
                        
                        <div style={{ 
                            display: 'flex', 
                            gap: '32px', 
                            backgroundColor: 'white', 
                            padding: '12px 24px', 
                            borderRadius: '100px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Expira em</span>
                                <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: '700', color: timeLeft < 60 ? 'var(--danger)' : 'var(--primary)', lineHeight: 1 }}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Válido Até</span>
                                <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>
                                    {formatExpiration(tokenData.data_expiracao)}
                                </span>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <QrCode size={16} />
                            <span>Aponte a câmera para ler o código</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '40px 0', color: 'var(--danger)' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                            <AlertCircle size={40} />
                        </div>
                        <h3 style={{margin: 0}}>Token Expirado</h3>
                        <p style={{margin: '8px 0 0 0', opacity: 0.8}}>Gere um novo código para continuar.</p>
                    </div>
                )}
            </div>
        )}
        
        <div style={{ marginTop: '32px' }}>
            <button 
                onClick={() => window.print()} 
                className="btn-logout" 
                style={{ margin: '0 auto', border: 'none', color: 'var(--primary)', gap: '8px' }}
            >
                <Printer size={18} /> Imprimir Cartaz para Totem
            </button>
        </div>

      </motion.div>
    </div>
  );
}

export default CheckinPage;