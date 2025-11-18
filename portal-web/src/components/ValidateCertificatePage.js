import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { buttonHoverTap } from '../App';
import api from '../api'; // Usamos o api, pois não precisa de token

function ValidateCertificatePage({ setPagina }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [validatedData, setValidatedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e) => {
    e.preventDefault();
    setError('');
    setValidatedData(null);
    setLoading(true);

    if (!codigo) {
      setError('Por favor, insira um código de validação.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/certificados/validar/${codigo}`);
      
      // --- CORREÇÃO CRÍTICA DE LÓGICA DE NEGÓCIO ---
      if (response.data.valido) {
          // Se for válido, armazena o objeto completo para exibição
          setValidatedData(response.data); 
      } else {
          // Se a API retornou 200, mas o certificado não existe/é inválido
          setError('Certificado não encontrado ou inválido. Verifique o código.');
          setValidatedData(null);
      }

    } catch (err) {
      // Captura erros de rede (404, 500, etc.)
      setError('Falha na comunicação com o serviço de validação. Tente novamente.');
      setValidatedData(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isCertificadoValido = validatedData && validatedData.valido;
  
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
      
      {isCertificadoValido && (
        <motion.div 
          className="card-inscricao" 
          style={{ marginTop: '2rem', borderColor: 'var(--green)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 style={{ color: 'var(--green)' }}>Certificado Válido</h3>
          
          {/* --- CORREÇÃO DOS NOMES DE CAMPO DO BACKEND --- */}
          <p><strong>Participante:</strong> {validatedData.usuario}</p> 
          <p><strong>Evento:</strong> {validatedData.evento}</p>
          {/* ----------------------------------------------- */}

          <p><strong>Emitido em:</strong> {new Date(validatedData.data_emissao).toLocaleDateString()}</p>
          {/* O código de validação é o que o usuário inseriu */}
          <p><strong>Código:</strong> {codigo}</p> 
          <p><strong>Template:</strong> {validatedData.template_certificado}</p> 

        </motion.div>
      )}
    </div>
  );
}

export default ValidateCertificatePage;