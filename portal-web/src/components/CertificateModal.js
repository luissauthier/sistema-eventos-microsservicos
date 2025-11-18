import React from 'react';
import { motion } from 'framer-motion';
import { X, Download, Printer } from 'lucide-react';

// Estilos baseados no template escolhido
const getTemplateStyle = (type) => {
  const base = { padding: '40px', textAlign: 'center', border: '10px solid #333', borderRadius: '10px', minHeight: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' };
  
  switch (type) {
    case 'dark':
      return { ...base, background: '#1a1a1a', color: '#fff', borderColor: '#00d4ff' };
    case 'minimal':
      return { ...base, background: '#fff', color: '#000', borderColor: '#000', fontFamily: 'Courier New' };
    default: // Classico
      return { ...base, background: '#fdfbf7', color: '#1f2937', borderColor: '#1d4ed8' };
  }
};

function CertificateModal({ certificado, onClose }) {
  if (!certificado) return null;

  const style = getTemplateStyle(certificado.template_certificado);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>Visualização do Certificado</h3>
          <div>
            <button onClick={handlePrint} style={{ marginRight: '10px', cursor: 'pointer' }}><Printer size={20}/></button>
            <button onClick={onClose} style={{ cursor: 'pointer' }}><X size={20}/></button>
          </div>
        </div>

        {/* ÁREA DO CERTIFICADO PARA IMPRESSÃO */}
        <div id="certificate-area" style={style}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', textTransform: 'uppercase' }}>
            Certificado de Participação
          </div>
          
          <p style={{ fontSize: '20px', lineHeight: '1.6' }}>
            Certificamos que
          </p>
          
          <h1 style={{ fontSize: '40px', margin: '20px 0', color: style.borderColor }}>
            {certificado.usuario_nome}
          </h1>
          
          <p style={{ fontSize: '20px' }}>
            participou com êxito do evento <strong>{certificado.evento_nome}</strong>, 
            realizado em {new Date(certificado.evento_data).toLocaleDateString()}, 
            totalizando a carga horária prevista.
          </p>

          <div style={{ marginTop: '60px', fontSize: '14px', opacity: 0.8 }}>
            <p>Código de Autenticação: <strong>{certificado.codigo_unico}</strong></p>
            <p>Data de Emissão: {new Date(certificado.data_emissao).toLocaleDateString()}</p>
            <p style={{ marginTop: '20px', fontSize: '12px' }}>
              Verifique a autenticidade em: http://localhost:3000/validar
            </p>
          </div>

          {/* Selo/Logo fictício */}
          <div style={{ 
            position: 'absolute', bottom: '40px', right: '40px', 
            width: '80px', height: '80px', borderRadius: '50%', 
            border: `4px solid ${style.borderColor}`, opacity: 0.3 
          }}></div>
        </div>

      </motion.div>
    </div>
  );
}

export default CertificateModal;