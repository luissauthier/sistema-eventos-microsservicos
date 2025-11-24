import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

// Ícones e Assets
import logoLight from './nexstage_sem_fundo_escuro.svg';
import logoDark from './nexstage_sem_fundo_branco.svg';
import { LogOut, Sun, Moon, PlusCircle, Calendar, Ticket, User as UserIcon, FileCheck, LogIn } from 'lucide-react';

// Páginas
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import EventosPage from './components/EventosPage';
import InscricoesPage from './components/InscricoesPage';
import ProfilePage from './components/ProfilePage';
import ValidateCertificatePage from './components/ValidateCertificatePage';
import CriarEventoPage from './components/CriarEventoPage';
import CheckinPage from './components/CheckinPage';
import CheckinRealizadoPage from './components/CheckinRealizadoPage';
import ChangePasswordScreen from './components/ChangePasswordScreen';
import NotFoundPage from './components/NotFoundPage';

// Animações

export const buttonHoverTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 }
};

// ==========================================
// 1. COMPONENTES DE LAYOUT E PROTEÇÃO
// ==========================================

// Layout que engloba a navegação para usuários LOGADOS
const ProtectedLayout = ({ user, logout, theme, toggleTheme }) => {
  const location = useLocation();
  
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) {
      return <ChangePasswordScreen onPasswordChanged={onPasswordChanged} />;
  }

  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        <div className="logo-container">
            <img src={theme === 'light' ? logoLight : logoDark} alt="NexStage" className="App-logo" />
        </div>
        
        <nav className="main-nav">
          <LinkButton to="/eventos" icon={Calendar} label="Eventos" active={location.pathname === '/eventos'} />
          <LinkButton to="/inscricoes" icon={Ticket} label="Minhas Inscrições" active={location.pathname === '/inscricoes'} />
          <LinkButton to="/perfil" icon={UserIcon} label="Perfil" active={location.pathname === '/perfil'} />
          
          {user.is_admin && (
            <LinkButton to="/criar-evento" icon={PlusCircle} label="Evento" active={location.pathname === '/criar-evento'} className="btn-admin" />
          )}
        </nav>

        <div className="header-actions">
           <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
           <button onClick={logout} className="btn-logout" title="Sair"><LogOut size={16} /> <span>Sair</span></button>
        </div>
      </header>
      
      <div className="conteudo">
        <PageTransition>
            <Outlet /> {/* Aqui renderiza a página filha (Eventos, Perfil, etc) */}
        </PageTransition>
      </div>
    </div>
  );
};

// Layout para páginas PÚBLICAS (Login, Registro, Validar)
const PublicLayout = ({ theme, toggleTheme }) => {
    const location = useLocation();
    return (
        <div className={`App ${theme}`}>
          <header className="App-header">
            <div className="logo-container">
                <img src={theme === 'light' ? logoLight : logoDark} alt="NexStage" className="App-logo" />
            </div>
             <nav className="main-nav">
                <LinkButton to="/validar" icon={FileCheck} label="Validar certificado" active={location.pathname === '/validar'} />
                <LinkButton to="/login" icon={LogIn} label="Login" active={location.pathname === '/login'} />
             </nav>
            <div className="header-actions">
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
          </header>
          <div className="conteudo">
             <PageTransition>
                <Outlet />
             </PageTransition>
          </div>
        </div>
    );
};

// Componentes Auxiliares de UI
const LinkButton = ({ to, icon: Icon, label, active, className = '' }) => {
    const navigate = useNavigate();
    return (
        <button className={`${className} ${active ? 'active' : ''}`} onClick={() => navigate(to)}>
            <Icon size={18} /><span>{label}</span>
        </button>
    );
}

const ThemeToggle = ({ theme, toggleTheme }) => (
    <motion.button onClick={toggleTheme} className="theme-toggle" whileTap={{ scale: 0.9, rotate: 15 }}>
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </motion.button>
);

const PageTransition = ({ children }) => (
    <AnimatePresence mode="wait">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%' }}
        >
            {children}
        </motion.div>
    </AnimatePresence>
);


// ==========================================
// 2. APLICAÇÃO PRINCIPAL (ROTEAMENTO)
// ==========================================

function App() {
  // Estado Global
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [theme, setTheme] = useState('light');

  // Controle de Login
  const handleLoginSuccess = (usuarioLogado) => {
    setUser(usuarioLogado);
    // Nota: O redirecionamento acontece dentro do componente LoginPage agora
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handlePasswordChanged = () => {
      setUser(prev => {
          const updated = { ...prev, must_change_password: false };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
      });
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <BrowserRouter>
        <Routes>
            {/* --- ROTAS PÚBLICAS --- */}
            <Route element={<PublicLayout theme={theme} toggleTheme={toggleTheme} />}>
                <Route path="/login" element={<LoginPage onLogin={handleLoginSuccess} />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/validar" element={<ValidateCertificatePage />} />
                {/* Redireciona raiz para login se não logado */}
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Route>

            {/* --- ROTAS PROTEGIDAS (REQUER LOGIN) --- */}
            <Route element={<ProtectedLayout user={user} logout={handleLogout} theme={theme} toggleTheme={toggleTheme} onPasswordChanged={handlePasswordChanged}/>}>
                <Route path="/eventos" element={<EventosPage user={user} />} />
                <Route path="/inscricoes" element={<InscricoesPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/criar-evento" element={user?.is_admin ? <CriarEventoPage /> : <Navigate to="/eventos" />} />
                <Route path="/checkin-qr" element={user?.is_admin ? <CheckinPage /> : <Navigate to="/eventos" />} />
                <Route path="/checkin-confirmar" element={<CheckinRealizadoPage />} />
            </Route>

            {/* --- ROTA 404 (FALLBACK) --- */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        
        {/* Captura de Parâmetros de URL (ex: QR Code) - Hook Personalizado ou Componente Invisível */}
        <AuthRedirectHandler user={user} />
    </BrowserRouter>
  );
}

// Manipulador de Lógica de URL (QR Code Token)
const AuthRedirectHandler = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tokenUrl = params.get('token');
        
        if (tokenUrl) {
             if (user) {
                 navigate('/checkin-confirmar');
             } else {
                 localStorage.setItem('pending_checkin_token', tokenUrl);
                 navigate('/login');
             }
        }
    }, [location, user, navigate]);

    return null;
};

export default App;