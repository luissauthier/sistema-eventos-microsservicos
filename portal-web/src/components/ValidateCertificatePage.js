// portal-web/src/components/ValidateCertificatePage.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Search, QrCode, CheckCircle} from 'lucide-react'; // Ícones novos
import api from '../api';
import { buttonHoverTap } from '../App';

function ValidateCertificatePage() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null); // null, 'valid', 'invalid'
  const [dadosCertificado, setDadosCertificado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigoUrl = params.get('codigo');

    if (codigoUrl) {
      setCodigo(codigoUrl);
      validarCertificado(codigoUrl);
    }
  }, []);

  const validarCertificado = async (codeToValidate) => {
    if (!codeToValidate) return;

    setLoading(true);
    setResultado(null);

    try {
      const response = await api.get(`/certificados/validar/${codeToValidate}`);
      
      if (response.data.valido) {
        setResultado('valid');
        setDadosCertificado(response.data);
      } else {
        setResultado('invalid');
      }
    } catch (error) {
      console.error(error);
      setResultado('invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    validarCertificado(codigo);
  };

  return (
    <div className="login-container" style={{ paddingTop: '40px', alignItems: 'flex-start' }}>
      <motion.div 
        className="login-card" // Reutiliza o estilo do card centralizado
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '500px' }}
      >
        
        {/* Cabeçalho com Ícone de Escudo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
             width: '64px', height: '64px', 
             backgroundColor: 'var(--bg-element)', 
             borderRadius: '50%', 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             margin: '0 auto 16px auto'
          }}>
             <ShieldCheck size={32} color="var(--primary)" />
          </div>
          <h2 style={{ marginBottom: '8px', color: 'var(--primary)' }}>Validar certificado</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Garanta a autenticidade do documento inserindo o código único abaixo.
          </p>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="form-group input-with-icon">
            <label>Insira o código de autenticidade:</label>
            <div style={{ position: 'relative' }}>
                <QrCode className="input-left-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Ex: A1B2-C3D4-E5F6" 
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.trim())}
                  maxLength={30}
                  autoFocus
                  style={{ fontFamily: 'monospace', letterSpacing: '1px', fontWeight: '600' }} // Destaque para o código
                />
            </div>
          </div>

          <motion.button 
            type="submit" 
            className="btn-login"
            disabled={loading || !codigo}
            {...buttonHoverTap}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Verificando...' : <><Search size={18} /> Verificar autenticidade!</>}
          </motion.button>
        </form>

        {/* RESULTADO: VÁLIDO */}
        {resultado === 'valid' && (
          <motion.div 
            className="result-box success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: '32px', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <CheckCircle size={32} className="text-green-600" />
                <div>
                    <h3 style={{ margin: 0, color: 'var(--success)', fontSize: '1.1rem' }}>Certificado autêntico!</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verificado em nossa base de dados</span>
                </div>
            </div>
            
            <div className="cert-details" style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <p style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Participante:</span> <br/>
                 <strong>{dadosCertificado.participante || dadosCertificado.usuario}</strong>
              </p>
              <p style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Evento:</span> <br/>
                 <strong>{dadosCertificado.evento}</strong>
              </p>
              <p>
                 <span style={{ color: 'var(--text-secondary)' }}>Data de Emissão:</span> <br/>
                 <strong>{new Date(dadosCertificado.data_emissao).toLocaleDateString()}</strong>
              </p>
            </div>
          </motion.div>
        )}

        {/* RESULTADO: INVÁLIDO */}
        {resultado === 'invalid' && (
          <motion.div 
            className="result-box error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ marginTop: '32px', display: 'flex', gap: '12px', alignItems: 'start', textAlign: 'left' }}
          >
            <ShieldAlert size={24} className="text-red-600" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--danger)', fontSize: '1rem' }}>Certificado Não Encontrado</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    O código informado não consta em nossos registros. Verifique se foi digitado corretamente.
                </p>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}

export default ValidateCertificatePage;