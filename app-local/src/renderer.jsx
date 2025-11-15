import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
// Importa o CSS do portal-web (que copiámos para cá)
import './App.css'; 
import './index.css';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Download, Upload, WifiOff, Wifi, UserPlus, Check } from 'lucide-react';

// Animações
const buttonHoverTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 }
};
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

// Enumeração de estados da aplicação
const AppState = {
  LOGGED_OUT: 'LOGGED_OUT',
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE'
};

function App() {
  const [appState, setAppState] = useState(AppState.LOGGED_OUT);
  const [message, setMessage] = useState('Por favor, faça login como atendente/admin.');
  const [loading, setLoading] = useState(false);
  const [atendente, setAtendente] = useState(null);
  
  // --- Estados do Login ---
  const [username, setUsername] = useState('admin_jeferson');
  const [password, setPassword] = useState('senha123');

  // --- Estados do Modo Offline ---
  const [offlineForm, setOfflineForm] = useState({ nome: '', email: '', senha: '' });
  const [lastLocalUser, setLastLocalUser] = useState(null); // Guarda { nome, id_local }
  
  const [localData, setLocalData] = useState({ eventos: [], inscricoes: [], presencas: [] });

  // --- Handlers de API (Online) ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Autenticando na API...');
    try {
      const result = await window.api.loginApi(username, password);
      if (result.success) {
        setAppState(AppState.ONLINE);
        setAtendente(result.user);
        setMessage(`Bem-vindo, ${result.user.full_name}. Pronto para sincronizar.`);
      } else {
        setMessage(`Erro: ${result.message}`);
      }
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
    setLoading(false);
  };

  const handleSyncDownload = async () => {
    setLoading(true);
    setMessage('Sincronizando (Download) eventos, utilizadores e inscrições...');
    try {
      const result = await window.api.sincronizarDownload();
      setMessage(result.message);
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
    setLoading(false);
  };

  const handleSyncUpload = async () => {
    setLoading(true);
    setMessage('Sincronizando (Upload) dados locais para o portal...');
    try {
      const result = await window.api.sincronizarUpload();
      setMessage(result.message);
      // Limpa os dados locais após o sync
      setLastLocalUser(null);
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
    setLoading(false);
  };

  const handleLogout = () => {
    setAtendente(null);
    setAppState(AppState.LOGGED_OUT);
    setMessage('Por favor, faça login como atendente/admin.');
  };

  // --- Handlers de Ações Offline (Itens 14, 15, 16) ---

  const handleGoOffline = async () => {
    setLoading(true);
    setMessage('A carregar dados do DB local...');
    try {
      const result = await window.api.buscarDadosLocais();
      if (result.success) {
        setLocalData(result.data);
        setAppState(AppState.OFFLINE);
        setMessage(`Modo Offline ativado. ${result.data.eventos.length} eventos carregados.`);
      } else { setMessage(`Erro: ${result.message}`); }
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
    setLoading(false);
  };

  const handleRegisterOffline = async (e) => {
    e.preventDefault();
    setMessage('A registar utilizador localmente...');
    try {
      const result = await window.api.cadastrarUsuarioLocal(offlineForm);
      if (result.success) {
        setMessage(`Participante 3 (ID Local: ${result.id}) registado! Pode inscrevê-lo.`);
        setLastLocalUser({ nome: offlineForm.nome, id_local: result.id });
        setOfflineForm({ nome: '', email: '', senha: '' });
      } else { setMessage(`Erro DB: ${result.message}`); }
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
  };

  const handleSubscribeOffline = async (eventoIdServer) => {
    if (!lastLocalUser) {
      setMessage("Erro: Registe primeiro o 'Participante 3' (Item 14)!");
      return;
    }
    setMessage(`A inscrever ${lastLocalUser.nome} no evento...`);
    try {
      const result = await window.api.inscreverLocal({
        usuario_id_local: lastLocalUser.id_local,
        evento_id_server: eventoIdServer
      });
      if (result.success) {
        setMessage(`Inscrição local (ID: ${result.id}) criada! Pode fazer o check-in.`);
        // Atualiza a UI
        const updatedInscricoes = [...localData.inscricoes, {
          id_local: result.id,
          evento_id_server: eventoIdServer,
          nome_usuario: lastLocalUser.nome,
          nome_evento: localData.eventos.find(e => e.id_server === eventoIdServer).nome
        }];
        setLocalData({...localData, inscricoes: updatedInscricoes});
      } else { setMessage(`Erro DB: ${result.message}`); }
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
  };
  
  const handleCheckinOffline = async (inscricaoLocalId) => {
    setMessage(`A registar presença para inscrição local ${inscricaoLocalId}...`);
    try {
      const result = await window.api.registrarPresencaLocal(inscricaoLocalId);
      if (result.success) {
        setMessage(`Check-in local (ID: ${result.id}) registado!`);
        // Atualiza a UI
        const updatedPresencas = [...localData.presencas, { id_local: result.id, inscricao_id_local: inscricaoLocalId }];
        setLocalData({...localData, presencas: updatedPresencas });
      } else { setMessage(`Erro DB: ${result.message}`); }
    } catch (error) { setMessage(`Erro de comunicação: ${error.message}`); }
  };

  // --- Funções Helper (Estado da UI) ---
  const getInscricaoLocal = (eventoIdServer) => {
    return localData.inscricoes.find(i => i.evento_id_server === eventoIdServer);
  };
  const hasCheckinLocal = (inscricao) => {
    if (!inscricao) return false;
    return localData.presencas.some(p => p.inscricao_id_local === inscricao.id_local);
  };

  // --- RENDERIZAÇÃO ---

  const renderLoggedOut = () => (
    <div className="form-container">
      <h2>App Local (Atendente)</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Username (Admin):</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <motion.button type="submit" className="btn-primary" {...buttonHoverTap} disabled={loading}>
          <LogIn size={16} /> {loading ? "A autenticar..." : "Login"}
        </motion.button>
      </form>
    </div>
  );

  const renderOnline = () => (
    <div className="form-container">
      <h2>Modo Online</h2>
      <p>Bem-vindo, {atendente?.full_name}.</p>
      <div className="botoes-sync">
        <motion.button onClick={handleSyncDownload} className="btn-primary" {...buttonHoverTap} disabled={loading}>
          <Download size={16} /> 1. Sincronizar (Download)
        </motion.button>
        <motion.button onClick={handleGoOffline} className="btn-offline" {...buttonHoverTap} disabled={loading}>
          <WifiOff size={16} /> 2. Ficar Offline (Item 13)
        </motion.button>
        <motion.button onClick={handleSyncUpload} className="btn-certificado" {...buttonHoverTap} disabled={loading}>
          <Upload size={16} /> 3. Sincronizar (Upload - Item 19)
        </motion.button>
        <motion.button onClick={handleLogout} className="btn-logout" {...buttonHoverTap} disabled={loading}>
          <LogOut size={16} /> Logout
        </motion.button>
      </div>
    </div>
  );

  const renderOffline = () => (
    <div className="offline-container">
      <motion.button onClick={() => setAppState(AppState.ONLINE)} className="btn-online" {...buttonHoverTap} disabled={loading}>
        <Wifi size={16} /> Voltar (Ficar Online - Item 18)
      </motion.button>
      
      {/* Item 14: Cadastrar Participante 3 */}
      <form onSubmit={handleRegisterOffline} className="form-container" style={{maxWidth: '500px'}}>
        <h3>Item 14: Registar Participante 3 (Offline)</h3>
        {lastLocalUser && <p className="form-success">Participante "{lastLocalUser.nome}" pronto a inscrever.</p>}
        <div className="form-group">
          <label>Nome:</label>
          <input type="text" value={offlineForm.nome} onChange={(e) => setOfflineForm({...offlineForm, nome: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Email (username):</label>
          <input type="email" value={offlineForm.email} onChange={(e) => setOfflineForm({...offlineForm, email: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Senha:</label>
          <input type="password" value={offlineForm.senha} onChange={(e) => setOfflineForm({...offlineForm, senha: e.target.value})} required />
        </div>
        <motion.button type="submit" className="btn-primary" {...buttonHoverTap}>
          <UserPlus size={16} /> Registar Localmente
        </motion.button>
      </form>
      
      {/* Itens 15 & 16: Lista de Eventos */}
      <div className="lista-eventos" style={{marginTop: '2rem'}}>
        <h3>Itens 15 & 16: Inscrever e Fazer Check-in (Offline)</h3>
        {localData.eventos.map(evento => {
          const inscricao = getInscricaoLocal(evento.id_server);
          const temCheckin = hasCheckin(inscricao);
          return (
            <motion.div key={evento.id_server} className="card-evento" variants={itemVariants}>
              <h4>{evento.nome}</h4>
              <p>{new Date(evento.data).toLocaleString()}</p>
              
              {!inscricao && (
                <motion.button onClick={() => handleSubscribeOffline(evento.id_server)} disabled={!lastLocalUser} {...buttonHoverTap}>
                  Inscrever "{lastLocalUser?.nome || 'Participante 3'}" (Item 15)
                </motion.button>
              )}
              {inscricao && !temCheckin && (
                <>
                  <span className="status-checkin checkin-ok">✓ Inscrito Localmente</span>
                  <motion.button onClick={() => handleCheckinOffline(inscricao.id_local)} className="btn-inscrever" {...buttonHoverTap}>
                    <Check size={16} /> Registar Presença (Item 16)
                  </motion.button>
                </>
              )}
              {temCheckin && (
                <span className="status-checkin checkin-ok" style={{fontWeight: 'bold'}}>
                  ✓ Presença Registada Localmente
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    // Usa as classes de CSS do portal-web
    <div className="App dark"> 
      <header className="App-header">
        <h1>App Local (Check-in)</h1>
        <p className={`status-message ${loading ? 'loading' : ''}`}>{message}</p>
      </header>
      <div className="conteudo">
        <AnimatePresence mode="wait">
          <motion.div 
            key={appState} 
            variants={pageVariants} 
            initial="initial" 
            animate="in" 
            exit="out"
          >
            {appState === AppState.LOGGED_OUT && renderLoggedOut()}
            {appState === AppState.ONLINE && renderOnline()}
            {appState === AppState.OFFLINE && renderOffline()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Renderiza a aplicação React
const root = createRoot(document.getElementById('root'));
root.render(<App />);