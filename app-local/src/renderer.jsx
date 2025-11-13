// Arquivo: src/renderer.jsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function App() {
  // States do Cadastro
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');

  // States da Sincronização
  const [syncMensagem, setSyncMensagem] = useState('');

  // States dos Eventos e Inscrições
  const [eventos, setEventos] = useState([]); 
  const [eventoMensagem, setEventoMensagem] = useState('');

  // AJUSTE: 'inscricoes' agora guarda objetos { eventoId, inscricaoId }
  const [inscricoes, setInscricoes] = useState([]); 

  // NOVO: State para Presenças (guarda o inscricaoId)
  const [checkins, setCheckins] = useState([]);

  // Handler do Cadastro (sem alteração)
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setMensagem('Cadastrando...');
    try {
      const resultado = await window.api.cadastrarUsuario({ nome, email, senha });
      if (resultado.success) {
        setMensagem(`Usuário cadastrado com ID local: ${resultado.id}!`);
        setNome(''); setEmail(''); setSenha('');
      } else { setMensagem(`Erro do banco: ${resultado.message}`); }
    } catch (error) { setMensagem(`Erro de comunicação: ${error.message}`); }
  };

  // Handler da Sincronização (sem alteração)
  const handleSync = async () => {
    setSyncMensagem('Sincronizando...');
    try {
      const resultado = await window.api.sincronizarEventosMock();
      setSyncMensagem(resultado.message);
    } catch (error) { setSyncMensagem(`Erro de comunicação: ${error.message}`); }
  };

  // Handler de Buscar Eventos (sem alteração)
  const handleBuscarEventos = async () => {
    setEventoMensagem('Buscando eventos no SQLite...');
    try {
      const resultado = await window.api.buscarEventosLocais();
      if (resultado.success) {
        setEventos(resultado.data);
        setEventoMensagem(`${resultado.data.length} eventos carregados do banco.`);
      } else { setEventoMensagem(`Erro: ${resultado.message}`); }
    } catch (error) { setEventoMensagem(`Erro de comunicação: ${error.message}`); }
  };

  // Handler de Inscrição (AJUSTADO)
  const handleInscricaoLocal = async (eventoId) => {
    setEventoMensagem(`Inscrevendo no evento ${eventoId}...`);
    const usuarioIdLocal = 1; // MOCK: Assumindo usuário 1

    try {
      const resultado = await window.api.inscreverLocal({ 
        usuario_id: usuarioIdLocal, 
        evento_id: eventoId 
      });

      if (resultado.success) {
        setEventoMensagem(`Inscrição local salva! (ID: ${resultado.id})`);
        // AJUSTE: Salva o objeto completo
        setInscricoes([...inscricoes, { 
          eventoId: eventoId, 
          inscricaoId: resultado.id 
        }]);
      } else { setEventoMensagem(`Erro ao inscrever: ${resultado.message}`); }
    } catch (error) { setEventoMensagem(`Erro de comunicação: ${error.message}`); }
  };

  // NOVO: Handler para registrar presença
  const handlePresencaLocal = async (eventoId) => {
    // 1. Encontrar o ID da inscrição para este evento
    const inscricao = inscricoes.find(i => i.eventoId === eventoId);
    if (!inscricao) {
      setEventoMensagem("Erro: Inscrição não encontrada no estado.");
      return;
    }

    const inscricaoId = inscricao.inscricaoId;
    setEventoMensagem(`Registrando presença para inscrição ${inscricaoId}...`);

    try {
      const resultado = await window.api.registrarPresencaLocal(inscricaoId);
      if (resultado.success) {
        setEventoMensagem(`Presença registrada com sucesso!`);
        // Adiciona o ID da inscrição ao state de checkins
        setCheckins([...checkins, inscricaoId]);
      } else {
        setEventoMensagem(`Erro ao registrar presença: ${resultado.message}`);
      }
    } catch (error) {
      setEventoMensagem(`Erro de comunicação: ${error.message}`);
    }
  };

  // --- Funções Helper (AJUSTADAS) ---

  // Retorna o *objeto* de inscrição, se houver
  const getInscricao = (eventoId) => {
    return inscricoes.find(i => i.eventoId === eventoId);
  };

  // Verifica se o check-in foi feito (pelo inscricaoId)
  const hasCheckin = (inscricao) => {
    if (!inscricao) return false;
    return checkins.includes(inscricao.inscricaoId);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* --- SEÇÃO DE CADASTRO (Item 14) --- */}
      <h1>App Local - Cadastro Offline (Item 14)</h1>
      {/* ... (formulário de cadastro, sem alteração) ... */}
      <form onSubmit={handleSubmit}>
        <div><label>Nome: </label><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
        <div><label>Email: </label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label>Senha: </label><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></div>
        <button type="submit">Cadastrar Localmente</button>
      </form>
      {mensagem && <p style={{ color: 'blue' }}>{mensagem}</p>}

      {/* --- SEÇÃO DE SINCRONIZAÇÃO (Item 12) --- */}
      <hr style={{ margin: '25px 0' }} />
      <h2>1. Sincronizar Eventos (Mock)</h2>
      <button onClick={handleSync}>Sincronizar Eventos</button>
      {syncMensagem && <p style={{ color: 'green' }}>{syncMensagem}</p>}

      {/* --- SEÇÃO DE INSCRIÇÃO E PRESENÇA (Item 15 & 16) --- */}
      <hr style={{ margin: '25px 0' }} />
      <h2>2. Inscrever e Registrar Presença (Itens 15 & 16)</h2>
      <button onClick={handleBuscarEventos}>Buscar Eventos do Banco Local</button>
      {eventoMensagem && <p style={{ color: 'blue' }}>{eventoMensagem}</p>}

      <div style={{ marginTop: '15px' }}>
        {eventos.map(evento => {
          // Lógica de estado para este card
          const inscricao = getInscricao(evento.id);
          const estaInscrito = !!inscricao;
          const temCheckin = hasCheckin(inscricao);

          return (
            <div key={evento.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <h4>{evento.nome} (ID: {evento.id})</h4>
              <p>{evento.descricao}</p>

              {/* --- Lógica de Botões (Item 15 e 16) --- */}

              {/* 1. Se não está inscrito: */}
              {!estaInscrito && (
                <button onClick={() => handleInscricaoLocal(evento.id)}>
                  Inscrever-se Localmente
                </button>
              )}

              {/* 2. Se está inscrito, mas sem check-in: */}
              {estaInscrito && !temCheckin && (
                <>
                  <span style={{ color: 'green', marginRight: '10px' }}>✓ Inscrito Localmente</span>
                  <button onClick={() => handlePresencaLocal(evento.id)}>
                    Registrar Presença (Item 16)
                  </button>
                </>
              )}

              {/* 3. Se está inscrito E com check-in: */}
              {estaInscrito && temCheckin && (
                <span style={{ color: 'blue', fontWeight: 'bold' }}>
                  ✓ Presença Registrada
                </span>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);