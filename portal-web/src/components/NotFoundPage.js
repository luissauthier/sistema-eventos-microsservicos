import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Map, ArrowLeft, Home } from 'lucide-react';
import { buttonHoverTap } from '../App'; // Importa a animação padrão

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="login-container" style={{ paddingTop: '60px' }}>
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: '500px', textAlign: 'center' }}
      >
        
        {/* Ícone Ilustrativo */}
        <div style={{ 
            width: '100px', height: '100px', 
            backgroundColor: '#fef2f2', // Vermelho bem claro
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px auto'
        }}>
            <Map size={48} color="#ef4444" strokeWidth={1.5} />
        </div>

        <h1 style={{ 
            fontSize: '4rem', fontWeight: '800', margin: 0, 
            lineHeight: 1, color: 'var(--primary)', opacity: 0.2 
        }}>
            404
        </h1>
        
        <h2 style={{ 
            fontSize: '1.5rem', fontWeight: '700', 
            color: 'var(--text-primary)', marginTop: '-20px', marginBottom: '12px' 
        }}>
            Página não encontrada
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Ops! Parece que você tentou acessar um lugar que não existe no mapa do nosso evento.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <motion.button 
                className="btn-logout" // Estilo secundário (outline)
                onClick={() => navigate(-1)} // Volta 1 página no histórico
                style={{ width: 'auto', padding: '0 20px' }}
                {...buttonHoverTap}
            >
                <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Voltar
            </motion.button>

            <motion.button 
                className="btn-login" // Estilo primário (sólido)
                onClick={() => navigate('/')} // Vai para Home
                style={{ width: 'auto', padding: '0 24px' }}
                {...buttonHoverTap}
            >
                <Home size={18} style={{ marginRight: '8px' }} /> Ir para o Início
            </motion.button>
        </div>

      </motion.div>
    </div>
  );
}

export default NotFoundPage;