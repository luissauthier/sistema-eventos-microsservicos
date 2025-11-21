// portal-web/src/components/ChangePasswordScreen.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Save, KeyRound } from 'lucide-react';
import api from '../api';
import { buttonHoverTap } from '../App';

function ChangePasswordScreen({ onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    if (newPassword !== confirmPassword) {
        setError("As senhas não conferem.");
        return;
    }

    setLoading(true);

    try {
      await api.patch("/usuarios/me", { 
          password: newPassword,
      });
      
      alert("Senha alterada com sucesso! Você já pode acessar o sistema.");
      
      onPasswordChanged(); 

    } catch (err) {
      console.error(err);
      setError("Erro ao salvar nova senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '420px' }}
      >
        
        {/* CABEÇALHO COM ÍCONE */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
             width: '64px', height: '64px', 
             backgroundColor: 'var(--bg-element)', 
             borderRadius: '50%', 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             margin: '0 auto 16px auto'
          }}>
             <KeyRound size={32} color="var(--primary)" />
          </div>
          <h2 style={{ marginBottom: '8px', color: 'var(--primary)' }}>Troca de Senha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Por segurança, defina uma nova senha pessoal para seu primeiro acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div className="form-group input-with-icon">
            <label>Nova Senha</label>
            <div style={{ position: 'relative' }}>
                <Lock className="input-left-icon" size={18} />
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                />
            </div>
          </div>

          <div className="form-group input-with-icon">
            <label>Confirmar Senha</label>
            <div style={{ position: 'relative' }}>
                <Lock className="input-left-icon" size={18} />
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  placeholder="Repita a senha"
                />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <motion.button 
            type="submit" 
            className="btn-login" 
            disabled={loading} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}
            {...buttonHoverTap}
          >
            {loading ? "Salvando..." : <><Save size={18}/> Definir Senha e Entrar</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default ChangePasswordScreen;