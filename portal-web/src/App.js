import React, { useState } from 'react';
import './App.css';
import logoNexstage from './logo_nexstage_sem_fundo.svg';
import { LogOut, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Importa os nossos componentes de página
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventosPage from './components/EventosPage';
import InscricoesPage from './components/InscricoesPage';
// --- NOVOS IMPORTS ---
import ProfilePage from './components/ProfilePage';
import ValidateCertificatePage from './components/ValidateCertificatePage';
// ---------------------

// --- Variantes de Animação (Mantidas) ---
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};
const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};
export const buttonHoverTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 }
};

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('access_token'));
  const [pagina, setPagina] = useState(authToken ? 'eventos' : 'login'); 
  const [theme, setTheme] = useState('light');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAuthToken(null);
    setPagina('login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // --- RENDERIZAÇÃO DE TELAS ---
  const renderPaginaPrincipal = () => {
    // Páginas Públicas (Não Logado)
    if (!authToken) {
      if (pagina === 'login') return (
        <motion.div key="login" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <LoginPage setPagina={setPagina} setAuthToken={setAuthToken} />
        </motion.div>
      );
      if (pagina === 'register') return (
        <motion.div key="register" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <RegisterPage setPagina={setPagina} />
        </motion.div>
      );
      // --- NOVA PÁGINA PÚBLICA ---
      if (pagina === 'validar') return (
        <motion.div key="validar" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <ValidateCertificatePage setPagina={setPagina} />
        </motion.div>
      );
    }
    
    // Páginas Protegidas (Logado)
    if (authToken) {
      if (pagina === 'eventos') return (
        <motion.div key="eventos" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <EventosPage />
        </motion.div>
      );
      if (pagina === 'inscricoes') return (
        <motion.div key="inscricoes" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <InscricoesPage />
        </motion.div>
      );
      // --- NOVA PÁGINA PROTEGIDA ---
      if (pagina === 'perfil') return (
        <motion.div key="perfil" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <ProfilePage />
        </motion.div>
      );
    }
    
    // Fallback
    return (
      <motion.div key="login-fallback" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
        <LoginPage setPagina={setPagina} setAuthToken={setAuthToken} />
      </motion.div>
    );
  };

  // --- COMPONENTE PRINCIPAL ---
  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        
        <img src={logoNexstage} alt="Nexstage Logo" className="App-logo" />
        
        {authToken && (
          // --- NAV LOGADA ---
          <nav className="main-nav">
            <button 
              className={pagina === 'eventos' ? 'active' : ''}
              onClick={() => setPagina('eventos')}
            >
              Eventos
            </button>
            <button 
              className={pagina === 'inscricoes' ? 'active' : ''}
              onClick={() => setPagina('inscricoes')}
            >
              Minhas Inscrições
            </button>
            {/* --- NOVO BOTÃO DE PERFIL --- */}
            <button 
              className={pagina === 'perfil' ? 'active' : ''}
              onClick={() => setPagina('perfil')}
            >
              Meu Perfil
            </button>
          </nav>
        )}
        
        {!authToken && (
           // --- NAV PÚBLICA (BOTÃO DE VALIDAR) ---
          <nav className="main-nav">
             <button 
              className={pagina === 'validar' ? 'active' : ''}
              onClick={() => setPagina('validar')}
            >
              Validar Certificado
            </button>
          </nav>
        )}

        <div className="header-actions">
          <motion.button 
            onClick={toggleTheme} 
            className="theme-toggle"
            whileTap={{ scale: 0.9, rotate: 15 }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </motion.button>
          
          {authToken && (
            <motion.button 
              onClick={handleLogout} 
              className="btn-logout"
              {...buttonHoverTap}
            >
              <LogOut size={16} /> Sair
            </motion.button>
          )}
        </div>
      </header>
      
      <div className="conteudo">
        <AnimatePresence mode="wait">
          {renderPaginaPrincipal()}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;