import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import { buttonHoverTap } from '../App';

// Função auxiliar para formatar a data de expiração
const formatExpiration = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
};

function CheckinPage({ setPagina, evento }) {
    // Estado para o evento (passado via prop)
    const eventoId = evento?.id;
    const eventoNome = evento?.nome || "Evento Desconhecido";

    // Estados do Token
    const [tokenData, setTokenData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [duracaoMinutos, setDuracaoMinutos] = useState(60); // Padrão 60 minutos
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    // Efeito para o contador de tempo restante
    useEffect(() => {
        if (!tokenData || !tokenData.data_expiracao) return;

        const expirationTime = new Date(tokenData.data_expiracao).getTime();

        const updateTime = () => {
            const now = new Date().getTime();
            const diff = expirationTime - now;
            
            if (diff > 0) {
                setTimeLeft(Math.floor(diff / 1000));
            } else {
                setTimeLeft(0);
                // O token expirou no cliente
                if (tokenData.data_expiracao && diff <= 0) {
                    setError("O token expirou. Por favor, gere um novo.");
                }
            }
        };

        // Atualiza imediatamente e depois a cada segundo
        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [tokenData]);

    const handleGenerateToken = async (e) => {
        e?.preventDefault(); // Para evitar refresh se chamado via form
        setError('');
        setSuccess('');
        setTokenData(null);
        setLoading(true);

        try {
            const response = await api.post('/admin/checkin/generate', {
                evento_id: eventoId,
                duracao_minutos: duracaoMinutos
            });
            
            setTokenData(response.data);
            setSuccess(`Novo token gerado com sucesso! Válido por ${duracaoMinutos} minutos.`);

        } catch (err) {
            setError('Falha ao gerar o token. Verifique se o evento existe ou o token de Admin.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Gera o token automaticamente na primeira carga (ou sempre que o eventoId mudar)
    useEffect(() => {
        if (eventoId) {
            handleGenerateToken();
        }
    }, [eventoId]); 


    // Formata o tempo restante (MM:SS)
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };


    if (!eventoId) {
        return <p className="form-error">Nenhum evento selecionado para check-in.</p>;
    }
    
    // =========================================================
    // RENDERIZAÇÃO
    // =========================================================

    return (
        <div className="form-container" style={{ maxWidth: '700px' }}>
            <h2><QrCode size={24} style={{ marginBottom: '-5px', marginRight: '5px' }} />Check-in QR Code: {eventoNome}</h2>
            <p>Este código permite o **Self-Check-in** dos participantes via Portal Web.</p>

            {/* Configuração de Duração */}
            <form onSubmit={handleGenerateToken} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                    <label>Duração do Token (minutos):</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="120"
                        value={duracaoMinutos} 
                        onChange={(e) => setDuracaoMinutos(parseInt(e.target.value))}
                        disabled={loading}
                    />
                </div>
                <motion.button 
                    type="submit" 
                    className="btn-primary"
                    {...buttonHoverTap}
                    style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}
                    disabled={loading}
                >
                    <RefreshCw size={16} /> {tokenData ? 'Gerar Novo' : 'Gerar Token'}
                </motion.button>
            </form>
            
            {loading && <p className="form-info">A gerar token de segurança...</p>}
            {error && <p className="form-error">{error}</p>}
            {success && tokenData && (
                <div className="card-inscricao" style={{ backgroundColor: '#e6ffe6', borderColor: 'var(--green)', padding: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        
                        {/* QR CODE - Desenha a URL Pública */}
                        {tokenData.url_publica && (
                            <div style={{ padding: '10px', backgroundColor: 'white', display: 'inline-block', border: '1px solid #ddd' }}>
                                <QRCodeSVG value={tokenData.url_publica} size={256} level="H" />
                            </div>
                        )}
                        
                        <h3 style={{ marginTop: '15px' }}>Código de Check-in Ativo</h3>
                        
                        <p style={{ color: timeLeft > 60 ? 'var(--blue)' : 'var(--red)', fontWeight: 'bold' }}>
                            <Clock size={16} style={{ marginBottom: '-3px', marginRight: '5px' }} />
                            Tempo Restante: {formatTime(timeLeft)}
                        </p>
                        
                        <small style={{ display: 'block', marginTop: '10px', wordBreak: 'break-all' }}>
                            <strong>URL Pública:</strong> <a href={tokenData.url_publica} target="_blank" rel="noopener noreferrer">{tokenData.url_publica}</a>
                        </small>
                    </div>
                    
                    <p style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px', textAlign: 'center' }}>
                        A expirar em: {formatExpiration(tokenData.data_expiracao)}
                    </p>
                </div>
            )}

            <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setPagina('eventos')}
                style={{ marginTop: '20px', width: '100%' }}
            >
                Voltar para Eventos
            </button>
        </div>
    );
}

export default CheckinPage;