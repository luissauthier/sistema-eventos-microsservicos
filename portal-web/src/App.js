import React, { useState } from 'react';
import './App.css';
import logoLight from './nexstage_sem_fundo_escuro.svg';
import logoDark from './nexstage_sem_fundo_branco.svg';
import { LogOut, Sun, Moon, PlusCircle, Calendar, Ticket, User, FileCheck, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventosPage from './components/EventosPage';
import InscricoesPage from './components/InscricoesPage';
import ProfilePage from './components/ProfilePage';
import ValidateCertificatePage from './components/ValidateCertificatePage';
import CriarEventoPage from './components/CriarEventoPage';
import CheckinPage from './components/CheckinPage';
import ChangePasswordScreen from './components/ChangePasswordScreen';

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
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Estes estados estavam abaixo do 'if' no seu código original, causando o erro.
  // Agora estão aqui em cima, seguros.
  const [eventoGerenciando, setEventoGerenciando] = useState(null);
  const [pagina, setPagina] = useState(authToken ? 'eventos' : 'login'); 
  const [eventoEditando, setEventoEditando] = useState(null);
  const [theme, setTheme] = useState('light');

  // 2. HANDLERS E FUNÇÕES AUXILIARES
  const handleLoginSuccess = (usuarioLogado) => {
      setUser(usuarioLogado);
      setAuthToken(localStorage.getItem('access_token'));
      setPagina('eventos'); // Redireciona para eventos ao logar
  };

  const handlePasswordChanged = () => {
      setUser(prevUser => {
          const updatedUser = { ...prevUser, must_change_password: false };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setAuthToken(null);
    setUser(null);
    setPagina('login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const lastPage = localStorage.getItem('last_public_page');
  if (!user && !authToken && !['register', 'validar'].includes(pagina)) {
     // Se a pagina atual no estado não é publica, mostramos o login
     // Nota: Alterei a lógica para olhar o estado 'pagina' em vez do localStorage direto para evitar loop
     if (pagina !== 'login' && pagina !== 'register' && pagina !== 'validar') {
        return <LoginPage onLogin={handleLoginSuccess} setPagina={setPagina} theme={theme} />;
     }
  }

  // Proteção de Troca de Senha
  if (user && user.must_change_password) {
      return <ChangePasswordScreen onPasswordChanged={handlePasswordChanged} />;
  }

  // --- RENDERIZAÇÃO DE TELAS ---
  const renderPaginaPrincipal = () => {
    
    // Páginas Públicas (Não Logado)
    if (!authToken) {
      if (pagina === 'login') return (
        <motion.div key="login" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <LoginPage onLogin={handleLoginSuccess} setPagina={setPagina} theme={theme}/>
        </motion.div>
      );
      if (pagina === 'register') return (
        <motion.div key="register" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <RegisterPage setPagina={setPagina} theme={theme}/>
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
      
      if (pagina === 'criar-evento' && user && user.is_admin) return (
        <motion.div key="criar-evento" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <CriarEventoPage 
             setPagina={setPagina} 
             eventoEditando={eventoEditando} 
          />
        </motion.div>
      );
      if (pagina === 'checkin-qr' && user && user.is_admin) return (
        <motion.div key="checkin-qr" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          <CheckinPage 
            setPagina={setPagina} 
            evento={eventoGerenciando} 
          />
        </motion.div>
      );
    }
    
    // Fallback padrão
    return (
      <motion.div key="login-fallback" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
        <LoginPage onLogin={handleLoginSuccess} setPagina={setPagina} />
      </motion.div>
    );
  };

  // --- COMPONENTE PRINCIPAL ---
  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        
        <div className="logo-container">
            {/* 2. Lógica de troca baseada no tema */}
            <img 
              src={theme === 'light' ? logoLight : logoDark} 
              alt="NexStage" 
              className="App-logo" 
            />
        </div>
        
        {authToken && (
          // --- NAV LOGADA (Centralizada via CSS) ---
          <nav className="main-nav">
            <button 
              className={pagina === 'eventos' ? 'active' : ''}
              onClick={() => setPagina('eventos')}
            >
              <Calendar size={18} />
              <span>Eventos</span>
            </button>

            <button 
              className={pagina === 'inscricoes' ? 'active' : ''}
              onClick={() => setPagina('inscricoes')}
            >
              <Ticket size={18} />
              <span>Minhas Inscrições</span>
            </button>

            <button 
              className={pagina === 'perfil' ? 'active' : ''}
              onClick={() => setPagina('perfil')}
            >
              <User size={18} />
              <span>Perfil</span>
            </button>
            
            {/* Botão Admin: Destaque sutil */}
            {user && user.is_admin && (
              <button 
                className={`btn-admin ${pagina === 'criar-evento' ? 'active' : ''}`}
                onClick={() => setPagina('criar-evento')}
                title="Área Administrativa"
              >
                <PlusCircle size={18} />
                <span>Evento</span>
              </button>
            )}
          </nav>
        )}
        
        {!authToken && (
           // --- NAV PÚBLICA (Não logado) ---
          <nav className="main-nav">
             <button 
              className={pagina === 'validar' ? 'active' : ''}
              onClick={() => setPagina('validar')}
            >
              <FileCheck size={18} />
              <span>Validar certificado</span>
            </button>
             <button 
              className={pagina === 'login' ? 'active' : ''}
              onClick={() => setPagina('login')}
            >
              <LogIn size={18} />
              <span>Login</span>
            </button>
          </nav>
        )}

        {/* Ações à Direita */}
        <div className="header-actions">
          <motion.button 
            onClick={toggleTheme} 
            className="theme-toggle"
            whileTap={{ scale: 0.9, rotate: 15 }}
            title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </motion.button>
          
          {authToken && (
            <motion.button 
              onClick={handleLogout} 
              className="btn-logout"
              {...buttonHoverTap}
              title="Sair do sistema"
            >
              <LogOut size={16} />
              <span>Sair</span>
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