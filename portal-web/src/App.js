import React, { useState } from 'react';
import './App.css';
import logoNexstage from './logo_nexstage_sem_fundo.svg';
import { LogOut, Sun, Moon, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventosPage from './components/EventosPage';
import InscricoesPage from './components/InscricoesPage';
import ProfilePage from './components/ProfilePage';
import ValidateCertificatePage from './components/ValidateCertificatePage';
import CriarEventoPage from './components/CriarEventoPage';
import CheckinPage from './components/CheckinPage';

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
  // 2. ADICIONAR ESTADO PARA O OBJETO DO USUÁRIO
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const [eventoGerenciando, setEventoGerenciando] = useState(null);
  const [pagina, setPagina] = useState(authToken ? 'eventos' : 'login'); 
  const [eventoEditando, setEventoEditando] = useState(null);
  const [theme, setTheme] = useState('light');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user'); // <<< 3. LIMPAR O USER NO LOGOUT
    setAuthToken(null);
    setUser(null); // <<< 3. LIMPAR O ESTADO DO USER
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
          {/* 4. PASSAR O setUser PARA O LOGIN */}
          <LoginPage setPagina={setPagina} setAuthToken={setAuthToken} setUser={setUser} />
        </motion.div>
      );
      if (pagina === 'register') return (
        <motion.div key="register" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <RegisterPage setPagina={setPagina} />
        </motion.div>
      );
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
          {/* 5. PASSAR 'user' e 'setPagina' PARA EVENTOS */}
          <EventosPage user={user} 
            setPagina={setPagina} 
            setEventoEditando={setEventoEditando} 
            setEventoGerenciando={setEventoGerenciando}
          />
        </motion.div>
      );
      if (pagina === 'inscricoes') return (
        <motion.div key="inscricoes" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <InscricoesPage />
        </motion.div>
      );
      if (pagina === 'perfil') return (
        <motion.div key="perfil" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <ProfilePage />
        </motion.div>
      );
      // 6. ADICIONAR A ROTA DE CRIAR EVENTO (SÓ PODE ACESSAR SE FOR ADMIN)
      if (pagina === 'criar-evento' && user && user.is_admin) return (
        <motion.div key="criar-evento" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <CriarEventoPage 
             setPagina={setPagina} 
             eventoEditando={eventoEditando} 
          />
        </motion.div>
      );
      if (pagina === 'checkin-qr' && user && user.is_admin) return ( // <<< NOVA ROTA
        <motion.div key="checkin-qr" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <CheckinPage 
            setPagina={setPagina} 
            evento={eventoGerenciando} // Passa o objeto do evento
          />
        </motion.div>
      );
    }
    
    // Fallback
    return (
      <motion.div key="login-fallback" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
        <LoginPage setPagina={setPagina} setAuthToken={setAuthToken} setUser={setUser} />
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
            <button 
              className={pagina === 'perfil' ? 'active' : ''}
              onClick={() => setPagina('perfil')}
            >
              Meu Perfil
            </button>
            
            {/* 7. BOTÃO DE ADMIN (SÓ APARECE SE user.is_admin === true) */}
            {user && user.is_admin && (
              <button 
                className={pagina === 'criar-evento' ? 'active-admin' : 'btn-admin'}
                onClick={() => setPagina('criar-evento')}
              >
                <PlusCircle size={16} />
                Novo Evento
              </button>
            )}
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