import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Map, ArrowLeft, Home } from 'lucide-react';
import { buttonHoverTap } from '../App';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    // Reutiliza 'login-container' para centralizar na tela
    <div className="login-container">
      <motion.div 
        // Reutiliza 'login-card' para ter o mesmo fundo, sombra e bordas do login
        className="login-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: '480px', textAlign: 'center' }}
      >
        
        {/* Círculo do ícone (estilo similar ao do check-in) */}
        <div style={{ 
            width: '80px', height: '80px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', // Vermelho suave
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px auto'
        }}>
            <Map size={40} className="text-red-500" style={{ color: '#ef4444' }} />
        </div>

        <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'var(--primary)', 
            marginBottom: '8px' 
        }}>
            Página não encontrada
        </h1>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
            Não conseguimos encontrar o caminho para a página que você procurou. Ela pode ter sido movida ou não existir.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            {/* Botão Principal - Voltar para Início */}
            <motion.button 
                className="btn-login" // Usa a classe do botão principal do seu sistema
                onClick={() => navigate('/')}
                {...buttonHoverTap}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
                <Home size={18} /> Ir para o Início
            </motion.button>

            {/* Botão Secundário - Voltar página anterior */}
            <motion.button 
                className="btn-link" // Usa a classe de link secundário
                onClick={() => navigate(-1)}
                style={{ marginTop: '8px', color: 'var(--text-secondary)' }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <ArrowLeft size={16} /> Voltar página anterior
                </span>
            </motion.button>
        </div>

      </motion.div>
    </div>
  );
}

export default NotFoundPage;
