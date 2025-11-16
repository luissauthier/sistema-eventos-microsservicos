// renderer.jsx — Refatorado para shadcn/ui + Tailwind + NexStage theme
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import "./tailwind.css";
import "./App.css";
import "./index.css";

import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  LogOut,
  Download,
  Upload,
  WifiOff,
  Wifi,
  UserPlus,
  Check,
} from "lucide-react";

/* shadcn/ui components (ajuste paths se necessário) */
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Alert } from "./components/ui/alert";
import { Skeleton } from "./components/ui/skeleton";

/* ============================================================
 * Animations & variants
 * ============================================================ */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const cardVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

const btnAnim = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/* ============================================================
 * App State
 * ============================================================ */
const AppState = Object.freeze({
  LOGGED_OUT: "LOGGED_OUT",
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
});

/* ============================================================
 * Helper utilities
 * ============================================================ */
const safe = (v, fallback = "") => (v === undefined || v === null ? fallback : v);

/* ============================================================
 * Main App
 * ============================================================ */
function App() {
  const [appState, setAppState] = useState(AppState.LOGGED_OUT);
  const [message, _setMessage] = useState(
    "Por favor, faça login como atendente/admin."
  );
  const [loading, _setLoading] = useState(false);

  const [atendente, setAtendente] = useState(null);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Offline form & data
  const [offlineForm, setOfflineForm] = useState({ nome: "", email: "", senha: "" });
  const [lastLocalUser, setLastLocalUser] = useState(null);
  const [localData, setLocalData] = useState({ eventos: [], inscricoes: [], presencas: [] });

  // small helpers
  const setMessage = (m) => _setMessage(String(m || "").trim());
  const setLoading = (v) => _setLoading(Boolean(v));

  const resetOffline = () => {
    setLastLocalUser(null);
    setLocalData({ eventos: [], inscricoes: [], presencas: [] });
  };

  /* ============================================================
   * ONLINE HANDLERS
   * ============================================================ */

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setMessage("Autenticando...");

    try {
      const res = await window.api.online.login(username, password);
      if (res?.success) {
        setAtendente(res.user);
        setAppState(AppState.ONLINE);
        setMessage(`Bem-vindo, ${safe(res.user.full_name, res.user.username)}.`);
      } else {
        setMessage(res?.message || "Credenciais inválidas.");
      }
    } catch (err) {
      setMessage(`Erro de comunicação: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDownload = async () => {
    setLoading(true);
    setMessage("Sincronizando (download)...");
    try {
      const res = await window.api.online.sincronizarDownload();
      setMessage(res?.message || "Sincronização finalizada.");
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUpload = async () => {
    setLoading(true);
    setMessage("Sincronizando (upload)...");
    try {
      const res = await window.api.online.sincronizarUpload();
      setMessage(res?.message || "Upload finalizado.");
      resetOffline();
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      window.api.online.logout();
    } catch (e) {
      console.warn("Logout local: ", e);
    }
    setAtendente(null);
    setAppState(AppState.LOGGED_OUT);
    setMessage("Sessão encerrada.");
    resetOffline();
  };

  /* ============================================================
   * OFFLINE HANDLERS
   * ============================================================ */

  const handleGoOffline = async () => {
    setLoading(true);
    setMessage("Carregando dados locais...");
    try {
      const res = await window.api.offline.buscarDadosLocais();
      if (res?.success) {
        // normalizar shape: { eventos, inscricoes, presencas } expected
        setLocalData(res.data || { eventos: [], inscricoes: [], presencas: [] });
        setAppState(AppState.OFFLINE);
        setMessage(`Modo offline: ${res.data?.eventos?.length || 0} eventos carregados.`);
      } else {
        setMessage(res?.message || "Falha ao carregar dados locais.");
      }
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOffline = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setMessage("Registrando participante local...");
    try {
      const res = await window.api.offline.cadastrarUsuarioLocal(offlineForm);
      if (res?.success) {
        setLastLocalUser({ nome: offlineForm.nome, id_local: res.id });
        setOfflineForm({ nome: "", email: "", senha: "" });
        setMessage(`Participante criado (ID local: ${res.id}).`);
      } else {
        setMessage(res?.message || "Erro ao registrar localmente.");
      }
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeOffline = async (eventoIdServer) => {
    if (!lastLocalUser) {
      setMessage("Registre o participante local primeiro.");
      return;
    }
    setLoading(true);
    setMessage("Criando inscrição local...");
    try {
      const res = await window.api.offline.inscreverLocal({
        usuario_id_local: lastLocalUser.id_local,
        evento_id_server: eventoIdServer,
      });

      if (res?.success) {
        // find event name
        const ev = localData.eventos.find((x) => x.id_server === eventoIdServer) || {};
        const newInsc = {
          id_local: res.id,
          evento_id_server: eventoIdServer,
          nome_usuario: lastLocalUser.nome,
          nome_evento: ev.nome || "Evento",
        };
        setLocalData((d) => ({ ...d, inscricoes: [...d.inscricoes, newInsc] }));
        setMessage(`Inscrição local criada (id: ${res.id}).`);
      } else {
        setMessage(res?.message || "Falha ao criar inscrição local.");
      }
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinOffline = async (inscricaoLocalId) => {
    setLoading(true);
    setMessage("Registrando presença local...");
    try {
      const res = await window.api.offline.registrarPresencaLocal(inscricaoLocalId);
      if (res?.success) {
        const newPres = { id_local: res.id, inscricao_id_local: inscricaoLocalId };
        setLocalData((d) => ({ ...d, presencas: [...d.presencas, newPres] }));
        setMessage("Presença registrada localmente.");
      } else {
        setMessage(res?.message || "Falha ao registrar presença.");
      }
    } catch (err) {
      setMessage(`Erro: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
   * UI helpers
   * ============================================================ */
  const getInscricaoLocal = (eventoIdServer) =>
    localData.inscricoes.find((i) => i.evento_id_server === eventoIdServer);

  const hasCheckinLocal = (inscricao) =>
    Boolean(inscricao && localData.presencas.some((p) => p.inscricao_id_local === inscricao.id_local));

  /* ============================================================
   * UI: small subcomponents (kept inline for single-file delivery)
   * ============================================================ */

  const Header = () => (
    <header className="flex items-center justify-between p-4">
      <div>
        <h1 className="text-2xl font-semibold">NexStage — App Local</h1>
        <p className="text-sm text-text-muted">{message}</p>
      </div>

      <div className="flex items-center gap-3">
        {appState === AppState.ONLINE && <span className="text-sm text-text-muted flex items-center gap-1"><Download size={16} /> Online</span>}
        {appState === AppState.OFFLINE && <span className="text-sm text-text-muted flex items-center gap-1"><Wifi size={16} /> Offline</span>}
        <Button variant="ghost" size="sm" onClick={() => window.api.log?.("ui-action")}><LogOut size={16} /></Button>
      </div>
    </header>
  );

  const LoginPanel = () => (
    <Card className="max-w-md mx-auto p-6">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="atendente@empresa" />
        </div>

        <div>
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            <LogIn size={16} /> <span className="ml-2">{loading ? "Autenticando..." : "Entrar"}</span>
          </Button>

          <Button variant="outline" onClick={() => { setUsername(""); setPassword(""); }} disabled={loading}>
            Limpar
          </Button>
        </div>
      </form>
    </Card>
  );

  const OnlinePanel = () => (
    <div className="max-w-4xl mx-auto space-y-5">
      <Card className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Modo Online</h2>
            <p className="text-sm text-text-muted">Operações disponíveis para sincronização e controle remoto.</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSyncDownload} disabled={loading}><Download size={16} /> <span className="ml-2">Download</span></Button>
            <Button variant="outline" onClick={handleGoOffline} disabled={loading}><WifiOff size={16} /> <span className="ml-2">Ficar Offline</span></Button>
            <Button onClick={handleSyncUpload} disabled={loading}><Upload size={16} /> <span className="ml-2">Upload</span></Button>
            <Button variant="ghost" onClick={handleLogout} disabled={loading}><LogOut size={16} /> <span className="ml-2">Logout</span></Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <p className="text-sm text-text-muted">Atendente:</p>
            <div className="font-medium">{safe(atendente?.full_name, atendente?.username || "—")}</div>
          </div>

          <div>
            <div className="text-xs text-text-muted">Status de sincronização</div>
            <div className="mt-1 text-sm">Última: —</div>
          </div>
        </div>
      </Card>

      {/* Quick info */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-muted">Eventos locais</div>
          <div className="text-xl font-semibold">{localData.eventos.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-muted">Inscrições locais</div>
          <div className="text-xl font-semibold">{localData.inscricoes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-muted">Presenças</div>
          <div className="text-xl font-semibold">{localData.presencas.length}</div>
        </Card>
      </div>
    </div>
  );

  const OfflinePanel = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modo Offline</h2>
        <Button variant="outline" onClick={() => setAppState(AppState.ONLINE)}><Wifi size={16} /> Voltar Online</Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold">Registrar Participante (Offline)</h3>
          <form onSubmit={handleRegisterOffline} className="space-y-3 mt-3">
            <div>
              <Label>Nome</Label>
              <Input value={offlineForm.nome} onChange={(e) => setOfflineForm({...offlineForm, nome: e.target.value})} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={offlineForm.email} onChange={(e) => setOfflineForm({...offlineForm, email: e.target.value})} required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={offlineForm.senha} onChange={(e) => setOfflineForm({...offlineForm, senha: e.target.value})} required />
            </div>

            <div className="flex gap-3 mt-2">
              <Button type="submit" disabled={loading}><UserPlus size={16} /> Registrar</Button>
              <Button variant="outline" onClick={() => setOfflineForm({ nome: "", email: "", senha: "" })}>Limpar</Button>
            </div>

            {lastLocalUser && <Alert className="mt-3" variant="success">Último participante: {lastLocalUser.nome} (ID local: {lastLocalUser.id_local})</Alert>}
          </form>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold">Inscrições & Check-in</h3>
          <div className="mt-3 space-y-3 max-h-72 overflow-auto">
            {localData.eventos.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              localData.eventos.map((evento) => {
                const inscr = getInscricaoLocal(evento.id_server);
                const hasCheckin = hasCheckinLocal(inscr);
                return (
                  <motion.div key={evento.id_server} className="p-3 border border-border rounded-base flex items-center justify-between">
                    <div>
                      <div className="font-medium">{evento.nome}</div>
                      <div className="text-xs text-text-muted">{new Date(evento.data).toLocaleString()}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!inscr && (
                        <Button onClick={() => handleSubscribeOffline(evento.id_server)} disabled={loading || !lastLocalUser}><UserPlus size={16} /></Button>
                      )}
                      {inscr && !hasCheckin && (
                        <Button onClick={() => handleCheckinOffline(inscr.id_local)}><Check size={16} /> <span className="ml-2">Check-in</span></Button>
                      )}
                      {hasCheckin && <div className="text-sm text-success font-medium">Presença registrada</div>}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  /* ============================================================
   * Render
   * ============================================================ */
  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      <main className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={appState} variants={pageVariants} initial="initial" animate="in" exit="out">
            {appState === AppState.LOGGED_OUT && (
              <div className="py-8">
                <LoginPanel />
              </div>
            )}

            {appState === AppState.ONLINE && (
              <div className="py-6">
                <OnlinePanel />
              </div>
            )}

            {appState === AppState.OFFLINE && (
              <div className="py-6">
                <OfflinePanel />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-4 text-center text-xs text-text-muted">
        NexStage Eventos — App Local
      </footer>
    </div>
  );
}

/* ============================================================
 * Bootstrap
 * ============================================================ */
const root = createRoot(document.getElementById("root"));
root.render(<App />);