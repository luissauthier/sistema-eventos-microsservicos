import React, { useState } from 'react';
import './App.css';

// --- DADOS MOCKADOS (EVENTOS) ---
const eventosFalsos = [
  { id: 1, nome: "Hackathon de IA 2025", data: "2025-12-01", descricao: "Um evento incrível para desenvolver soluções com IA." },
  { id: 2, nome: "Workshop de Microsserviços", data: "2025-11-20", descricao: "Aprenda a arquitetura que estamos usando neste projeto!" },
  { id: 3, nome: "Palestra sobre Carreira Dev", data: "2025-11-25", descricao: "Dicas para alavancar sua carreira." }
];

function App() {
  // --- NOSSOS ESTADOS GLOBAIS ---
  const [authToken, setAuthToken] = useState(null);
  
  // Controle de Página Principal
  // 'eventos', 'inscricoes', 'login', 'register'
  const [pagina, setPagina] = useState('login'); 
  
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  
  // Estado para rastrear os check-ins (mockado)
  // Vamos fingir que o usuário já fez check-in no evento 2
  const [checkins, setCheckins] = useState([2]); 

  // ---------------------------------
  // --- MOCKS DAS FUNÇÕES DE API ---
  // ---------------------------------

  const handleLogin = (e) => {
    e.preventDefault(); 
    console.log("Mock: Usuário logado com sucesso!");
    setAuthToken("um-token-jwt-falso-gerado-pelo-backend");
    setPagina('eventos'); // Manda para a página de eventos
  };

  const handleRegister = (e) => {
    e.preventDefault();
    console.log("Mock: Usuário cadastrado com sucesso!");
    setPagina('login'); // Manda para o login após o cadastro
  };

  const handleLogout = () => {
    setAuthToken(null);
    setEventoSelecionado(null);
    setInscricoes([]);
    setCheckins([]); // Limpa os check-ins
    setPagina('login'); // Manda para o login
    console.log("Mock: Usuário deslogado.");
  };

  const handleInscricao = (evento) => {
    console.log(`Mock: Inscrito no evento ${evento.nome}`);
    setInscricoes([...inscricoes, evento.id]);
  };

  const handleCancelarInscricao = (eventoId) => {
    console.log(`Mock: Inscrição cancelada do evento ${eventoId}`);
    setInscricoes(inscricoes.filter(id => id !== eventoId));
  };

  const isInscrito = (eventoId) => inscricoes.includes(eventoId);
  
  // Helper para verificar check-in
  const hasCheckin = (eventoId) => checkins.includes(eventoId);
  
  // Helper para encontrar os objetos de evento
  const getEventosInscritos = () => {
    return eventosFalsos.filter(evento => inscricoes.includes(evento.id));
  };

  // ---------------------------------
  // --- RENDERIZAÇÃO DE TELAS ---
  // ---------------------------------

  // TELA DE LOGIN
  const renderLoginPage = () => (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        {/* ... (campos do formulário) ... */}
        <div className="form-group">
          <label>Email:</label>
          <input type="email" placeholder="seu@email.com" required />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" className="btn-primary">Entrar</button>
        <p className="form-switch">
          Não tem conta? 
          <button onClick={() => setPagina('register')} className="btn-link">
            Cadastre-se
          </button>
        </p>
      </form>
    </div>
  );

  // TELA DE CADASTRO
  const renderRegisterPage = () => (
    <div className="form-container">
      <h2>Cadastro</h2>
      <form onSubmit={handleRegister}>
        {/* ... (campos do formulário) ... */}
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
        <button type="submit" className="btn-primary">Cadastrar</button>
        <p className="form-switch">
          Já tem conta? 
          <button onClick={() => setPagina('login')} className="btn-link">
            Faça login
          </button>
        </p>
      </form>
    </div>
  );

  // TELA DE EVENTOS (Lista ou Detalhes)
  const renderEventosPage = () => (
    <>
      {eventoSelecionado ? (
        // Detalhes do Evento
        <div className="evento-detalhe">
          <button onClick={() => setEventoSelecionado(null)} className="btn-voltar">
            &larr; Voltar para a lista
          </button>
          <h2>{eventoSelecionado.nome}</h2>
          <p><strong>Data:</strong> {eventoSelecionado.data}</p>
          <p>{eventoSelecionado.descricao}</p>
          
          {isInscrito(eventoSelecionado.id) ? (
            <button 
              className="btn-cancelar" 
              onClick={() => handleCancelarInscricao(eventoSelecionado.id)}
            >
              Cancelar Inscrição
            </button>
          ) : (
            <button 
              className="btn-inscrever" 
              onClick={() => handleInscricao(eventoSelecionado)}
            >
              Inscrever-se
            </button>
          )}
        </div>
      ) : (
        // Lista de Eventos
        <div className="lista-eventos">
          <h2>Eventos Disponíveis</h2>
          {eventosFalsos.map(evento => (
            <div key={evento.id} className="card-evento">
              <h3>{evento.nome}</h3>
              <p><strong>Data:</strong> {evento.data}</p>
              <button onClick={() => setEventoSelecionado(evento)}>
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // TELA "MINHAS INSCRIÇÕES" (Mockup do Check-in)
  const renderInscricoesPage = () => (
    <div className="lista-inscricoes">
      <h2>Minhas Inscrições</h2>
      {getEventosInscritos().length === 0 ? (
        <p>Você ainda não se inscreveu em nenhum evento.</p>
      ) : (
        getEventosInscritos().map(evento => (
          <div key={evento.id} className="card-inscricao">
            <h3>{evento.nome}</h3>
            {/* Aqui está o mockup do check-in (item 10) */}
            {hasCheckin(evento.id) ? (
              <span className="status-checkin checkin-ok">
                ✓ Presença Registrada
              </span>
            ) : (
              <span className="status-checkin checkin-pendente">
                Aguardando Check-in
              </span>
            )}
            <button 
              className="btn-cancelar-small"
              onClick={() => handleCancelarInscricao(evento.id)}
            >
              Cancelar
            </button>
          </div>
        ))
      )}
    </div>
  );

  // Função para renderizar a página principal correta
  const renderPaginaPrincipal = () => {
    if (!authToken) {
      if (pagina === 'login') return renderLoginPage();
      if (pagina === 'register') return renderRegisterPage();
    }
    
    if (authToken) {
      if (pagina === 'eventos') return renderEventosPage();
      if (pagina === 'inscricoes') return renderInscricoesPage();
    }

    return renderLoginPage(); // Fallback
  };

  // --- COMPONENTE PRINCIPAL ---
  return (
    <div className="App">
      <header className="App-header">
        <h1>Portal de Eventos</h1>
        
        {/* Navegação principal (só aparece logado) */}
        {authToken && (
          <nav className="main-nav">
            <button 
              className={pagina === 'eventos' ? 'active' : ''}
              onClick={() => {
                setPagina('eventos');
                setEventoSelecionado(null); // Reseta a seleção
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

        {authToken && (
          <button onClick={handleLogout} className="btn-logout">
            Sair (Logout)
          </button>
        )}
      </header>
      
      <div className="conteudo">
        {renderPaginaPrincipal()}
      </div>
    </div>
  );
}

export default App;