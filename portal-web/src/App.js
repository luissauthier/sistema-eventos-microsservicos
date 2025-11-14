import React, { useState } from 'react';
import './App.css';
// Importa o logo
import logoNexstage from './logo_nexstage_sem_fundo.svg';

// Importa os ícones (Passo 1)
import { 
  ArrowLeft, 
  LogOut, 
  CheckCircle, 
  Clock, 
  X, 
  Sun, 
  Moon,
  ArrowRight
} from 'lucide-react';

// Importa o Framer Motion (Passo 2)
import { motion, AnimatePresence } from 'framer-motion';


// --- DADOS MOCKADOS (EVENTOS) ---
const eventosFalsos = [
  { id: 1, nome: "Hackathon de IA 2025", data: "2025-12-01", descricao: "Um evento incrível para desenvolver soluções com IA." },
  { id: 2, nome: "Workshop de Microsserviços", data: "2025-11-20", descricao: "Aprenda a arquitetura que estamos usando neste projeto!" },
  { id: 3, nome: "Palestra sobre Carreira Dev", data: "2025-11-25", descricao: "Dicas para alavancar sua carreira." }
];

// --- Variantes de Animação (Framer Motion) ---

// Animação para a página inteira (fade in/out)
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

// Animação para listas (stagger)
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Animação para itens da lista
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Animação de hover/tap para botões
const buttonHoverTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 }
};


function App() {
  // --- NOSSOS ESTADOS GLOBAIS ---
  const [authToken, setAuthToken] = useState(null);
  const [pagina, setPagina] = useState('login'); 
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  const [checkins, setCheckins] = useState([2]); 
  
  // Novo estado para o Dark Mode (Passo 3)
  const [theme, setTheme] = useState('light');

  // --- Funções (Mocks) ---
  const handleLogin = (e) => { e.preventDefault(); setAuthToken("token-falso"); setPagina('eventos'); };
  const handleRegister = (e) => { e.preventDefault(); setPagina('login'); };
  const handleLogout = () => { setAuthToken(null); setPagina('login'); };
  const handleInscricao = (evento) => setInscricoes([...inscricoes, evento.id]);
  const handleCancelarInscricao = (eventoId) => setInscricoes(inscricoes.filter(id => id !== eventoId));
  const isInscrito = (eventoId) => inscricoes.includes(eventoId);
  const hasCheckin = (eventoId) => checkins.includes(eventoId);
  const getEventosInscritos = () => eventosFalsos.filter(evento => inscricoes.includes(evento.id));

  // Função para alternar o tema (Passo 3)
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // ---------------------------------
  // --- RENDERIZAÇÃO DE TELAS ---
  // ---------------------------------

  const renderLoginPage = () => (
    <div className="form-container">
      <h2>Entrar na Plataforma</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email:</label>
          <input type="email" placeholder="seu@email.com" required />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input type="password" placeholder="••••••••" required />
        </div>
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap} // Animação
        >
          Entrar
        </motion.button>
        <p className="form-switch">
          Não tem conta? 
          <button onClick={() => setPagina('register')} className="btn-link">
            Cadastre-se
          </button>
        </p>
      </form>
    </div>
  );

  const renderRegisterPage = () => (
    <div className="form-container">
      <h2>Criar Conta</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Nome:</label>
          <input type="text" placeholder="Seu nome completo" required />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input type="email" placeholder="seu@email.com" required />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input type="password" placeholder="••••••••" required />
        </div>
        <motion.button 
          type="submit" 
          className="btn-primary"
          {...buttonHoverTap} // Animação
        >
          Cadastrar
        </motion.button>
        <p className="form-switch">
          Já tem conta? 
          <button onClick={() => setPagina('login')} className="btn-link">
            Faça login
          </button>
        </p>
      </form>
    </div>
  );

  const renderEventosPage = () => (
    <>
      {eventoSelecionado ? (
        // Detalhes do Evento
        <motion.div 
          className="evento-detalhe"
          // Animação de entrada do detalhe
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button 
            onClick={() => setEventoSelecionado(null)} 
            className="btn-voltar"
            {...buttonHoverTap}
          >
            <ArrowLeft size={16} /> Voltar para a lista
          </motion.button>
          <h2>{eventoSelecionado.nome}</h2>
          <p><strong>Data:</strong> {eventoSelecionado.data}</p>
          <p>{eventoSelecionado.descricao}</p>
          
          {isInscrito(eventoSelecionado.id) ? (
            <motion.button 
              className="btn-cancelar" 
              onClick={() => handleCancelarInscricao(eventoSelecionado.id)}
              {...buttonHoverTap}
            >
              <X size={16} /> Cancelar Inscrição
            </motion.button>
          ) : (
            <motion.button 
              className="btn-inscrever" 
              onClick={() => handleInscricao(eventoSelecionado)}
              {...buttonHoverTap}
            >
              Inscrever-se agora <ArrowRight size={16} />
            </motion.button>
          )}
        </motion.div>
      ) : (
        // Lista de Eventos
        <motion.div 
          className="lista-eventos"
          variants={containerVariants} // Animação Stagger
          initial="hidden"
          animate="visible"
        >
          <h2>Eventos Disponíveis</h2>
          {eventosFalsos.map(evento => (
            <motion.div 
              key={evento.id} 
              className="card-evento"
              variants={itemVariants} // Animação Stagger
              whileHover={{ y: -4 }} // Eleva o card no hover
            >
              <h3>{evento.nome}</h3>
              <p><strong>Data:</strong> {evento.data}</p>
              <motion.button 
                onClick={() => setEventoSelecionado(evento)}
                {...buttonHoverTap}
              >
                Ver Detalhes
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );

  const renderInscricoesPage = () => (
    <motion.div 
      className="lista-inscricoes"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2>Minhas Inscrições</h2>
      {getEventosInscritos().length === 0 ? (
        <p>Você ainda não se inscreveu em nenhum evento.</p>
      ) : (
        getEventosInscritos().map(evento => (
          <motion.div 
            key={evento.id} 
            className="card-inscricao"
            variants={itemVariants}
          >
            <h3>{evento.nome}</h3>
            {hasCheckin(evento.id) ? (
              <span className="status-checkin checkin-ok">
                <CheckCircle size={16} /> Presença Registrada
              </span>
            ) : (
              <span className="status-checkin checkin-pendente">
                <Clock size={16} /> Aguardando Check-in
              </span>
            )}
            <motion.button 
              className="btn-cancelar-small"
              onClick={() => handleCancelarInscricao(evento.id)}
              {...buttonHoverTap}
            >
              <X size={14} /> Cancelar
            </motion.button>
          </motion.div>
        ))
      )}
    </motion.div>
  );

  // Função para renderizar a página principal correta
  const renderPaginaPrincipal = () => {
    // Usamos o 'pagina' como 'key' para o AnimatePresence
    // saber qual componente está entrando/saindo
    if (!authToken) {
      if (pagina === 'login') return (
        <motion.div key="login" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          {renderLoginPage()}
        </motion.div>
      );
      if (pagina === 'register') return (
        <motion.div key="register" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          {renderRegisterPage()}
        </motion.div>
      );
    }
    
    if (authToken) {
      if (pagina === 'eventos') return (
        <motion.div key="eventos" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          {renderEventosPage()}
        </motion.div>
      );
      if (pagina === 'inscricoes') return (
        <motion.div key="inscricoes" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          {renderInscricoesPage()}
        </motion.div>
      );
    }
    
    // Fallback
    return (
      <motion.div key="login-fallback" variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
        {renderLoginPage()}
      </motion.div>
    );
  };

  // --- COMPONENTE PRINCIPAL ---
  return (
    // Adiciona a classe 'dark' ao App com base no estado (Passo 3)
    <div className={`App ${theme}`}>
      <header className="App-header">
        
        <img src={logoNexstage} alt="Nexstage Logo" className="App-logo" />
        
        {authToken && (
          <nav className="main-nav">
            <button 
              className={pagina === 'eventos' ? 'active' : ''}
              onClick={() => {
                setPagina('eventos');
                setEventoSelecionado(null); 
              }}
            >
              Eventos
            </button>
            <button 
              className={pagina === 'inscricoes' ? 'active' : ''}
              onClick={() => setPagina('inscricoes')}
            >
              Minhas Inscrições
            </button>
          </nav>
        )}

        <div className="header-actions">
          {/* Botão de Tema (Passo 3) */}
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
        {/* AnimatePresence gerencia as animações de entrada/saída */}
        <AnimatePresence mode="wait">
          {renderPaginaPrincipal()}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;