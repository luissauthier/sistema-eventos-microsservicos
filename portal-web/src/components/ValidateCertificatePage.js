import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App';
import api from '../api'; // Usamos o api, pois não precisa de token

function ValidateCertificatePage({ setPagina }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [certificado, setCertificado] = useState(null); // Armazena o resultado
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e) => {
    e.preventDefault();
    setError('');
    setCertificado(null);
    setLoading(true);

    if (!codigo) {
      setError('Por favor, insira um código de validação.');
      setLoading(false);
      return;
    }

    try {
      // Usamos o 'api' para a chamada pública
      const response = await api.get(`/certificados/validar/${codigo}`);
      setCertificado(response.data); // Guarda o certificado encontrado
    } catch (err) {
      setError('Certificado não encontrado ou inválido.');
      setCertificado(null); // Limpa resultados antigos
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <h2>Validar Certificado</h2>
      <p>Insira o código de autenticação presente no certificado para verificar a sua validade.</p>
      
      <form onSubmit={handleValidate}>
        <div className="form-group">
          <label>Código de Autenticação:</label>
          <input 
            type="text" 
            placeholder="ex: 123e4567-e89b-12d3-a456-426614174000" 
            required 
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
        
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap}
          disabled={loading}
        >
          {loading ? "A verificar..." : "Verificar"}
        </motion.button>
        
        <p className="form-switch">
          Voltar para o 
          <button onClick={() => setPagina('login')} className="btn-link">
            Login
          </button>
        </p>
      </form>

      {/* --- Exibição do Resultado --- */}
      {error && <p className="form-error">{error}</p>}

      {certificado && (
        <motion.div 
          className="card-inscricao" 
          style={{ marginTop: '2rem', borderColor: 'var(--green)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 style={{ color: 'var(--green)' }}>Certificado Válido</h3>
          <p><strong>Participante:</strong> {certificado.nome_usuario}</p>
          <p><strong>Evento:</strong> {certificado.nome_evento}</p>
          <p><strong>Emitido em:</strong> {new Date(certificado.data_emissao).toLocaleDateString()}</p>
          <p><strong>Código:</strong> {certificado.codigo_autenticacao}</p>
        </motion.div>
      )}
    </div>
  );
}

export default ValidateCertificatePage;