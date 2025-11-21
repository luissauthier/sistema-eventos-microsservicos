// renderer.jsx — Interface Profissional (UI Fixes)
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import LogoNexStage from "./components/ui/logo_nexstage_sem_fundo.svg"

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
  Search,
  CloudOff,
  AlertCircle,
  Calendar,
  MapPin,
  CheckCircle2,
  Trash2,
  UserMinus,
  X  
} from "lucide-react";

/* shadcn/ui components */
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Skeleton } from "./components/ui/skeleton";
import { Separator } from "./components/ui/separator";

// Variantes de Animação
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 },
};

const AppState = Object.freeze({
  LOGGED_OUT: "LOGGED_OUT",
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
});

/* ============================================================
 * Componente: Modal de Confirmação (Substituto do window.confirm)
 * ============================================================ */
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, type = "danger" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className={`p-4 ${type === 'danger' ? 'bg-red-50' : 'bg-blue-50'} border-b border-slate-100 flex items-center gap-3`}>
           {type === 'danger' ? <AlertCircle className="text-red-600" /> : <CheckCircle2 className="text-blue-600" />}
           <h3 className={`font-bold ${type === 'danger' ? 'text-red-900' : 'text-blue-900'}`}>{title}</h3>
        </div>
        
        <div className="p-6 text-slate-600 text-sm leading-relaxed">
           {message}
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
           <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
           <Button 
             onClick={onConfirm} 
             className={type === 'danger' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
           >
             Confirmar
           </Button>
        </div>
      </motion.div>
    </div>
  );
};

/* ============================================================
 * Componente: Badge de Status de Sync
 * ============================================================ */
const SyncStatusBadge = ({ data }) => {
  const countPending = (list) => {
    if (!list || !Array.isArray(list)) return 0;
    return list.filter(item => item.sync_status && item.sync_status !== 'synced').length;
  };

  const pendingUsers = countPending(data.usuarios);
  const pendingSubs = countPending(data.inscricoes);
  const pendingChecks = countPending(data.presencas);

  const totalPending = pendingUsers + pendingSubs + pendingChecks;

  if (totalPending === 0) {
    return (
      <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 shadow-sm">
        <CheckCircle2 size={14} className="text-green-600" />
        <span className="text-xs font-semibold">Tudo sincronizado</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 shadow-sm animate-pulse">
      <CloudOff size={14} />
      <span className="text-xs font-bold">{totalPending} pendentes</span>
    </div>
  );
};

/* ============================================================
 * Componente: Card de Evento (Onde estava a "lacuna")
 * ============================================================ */
const EventoCard = ({ evento, inscricao, hasCheckin, status, onSubscribe, onCheckin, onCancelCheckin, onCancelInscricao, loading }) => {
  // Verifica se o status é cancelado
  const isCancelled = status === 'cancelada';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group flex items-center gap-4 p-4 bg-white border rounded-xl shadow-sm transition-all relative overflow-hidden ${isCancelled ? 'border-red-200 bg-red-50 opacity-75' : 'border-slate-100 hover:shadow-md'}`}
    >
      {/* Barra lateral colorida */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCancelled ? 'bg-red-400' : (hasCheckin ? 'bg-green-500' : (inscricao ? 'bg-blue-500' : 'bg-slate-300'))}`} />

      <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center p-1 border border-slate-100 overflow-hidden relative">
         <Calendar className="absolute text-slate-600 opacity-50" size={20} />
         <img src={LogoNexStage} alt="Logo" className="w-full h-full object-contain opacity-90 relative z-10" onError={(e) => e.target.style.opacity = 0} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 truncate">{evento.nome}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Calendar size={12} /> {evento.data_evento ? new Date(evento.data_evento).toLocaleDateString() : 'Data n/a'}</span>
          {/* Tag visual de cancelado */}
          {isCancelled && <span className="text-red-600 font-bold flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide">Inscrição Cancelada</span>}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {/* Botão Inscrever aparece se não tiver inscrição OU se estiver cancelada (para reativar) */}
        {(!inscricao || isCancelled) && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => inscricao ? onSubscribe(inscricao.id_local) : onSubscribe()} 
            disabled={loading} 
            className="h-9 px-4 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <UserPlus size={16} className="mr-2" /> {isCancelled ? "Reativar" : "Inscrever"}
          </Button>
        )}

        {/* Ações de Inscrito (Só aparecem se NÃO estiver cancelado e NÃO tiver checkin) */}
        {inscricao && !isCancelled && !hasCheckin && (
          <div className="flex items-center gap-1">
             <Button size="icon" variant="ghost" onClick={onCancelInscricao} disabled={loading} title="Cancelar Inscrição" className="h-9 w-9 text-slate-400 hover:text-red-500">
               <Trash2 size={16} />
             </Button>
             <Button size="sm" onClick={onCheckin} disabled={loading} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white">
               <Check size={16} className="mr-2" /> Check-in
             </Button>
          </div>
        )}

        {/* Estado de Check-in Realizado */}
        {hasCheckin && (
          <div className="flex items-center gap-2">
             <Button size="icon" variant="ghost" onClick={onCancelCheckin} disabled={loading} title="Desfazer Check-in" className="h-8 w-8 text-slate-400 hover:text-amber-600">
               <UserMinus size={16} />
             </Button>
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg border border-green-200 cursor-default">
               <CheckCircle2 size={16} className="text-green-600" />
               <span className="text-xs font-bold uppercase tracking-wide">Presente</span>
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};


/* ============================================================
 * APP PRINCIPAL
 * ============================================================ */
function App() {
  const [appState, setAppState] = useState(AppState.LOGGED_OUT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [atendente, setAtendente] = useState(null);
  
  // Estado Local
  const [localData, setLocalData] = useState({ eventos: [], inscricoes: [], presencas: [], usuarios: [] });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  // Fluxo de Check-in
  const [checkinStep, setCheckinStep] = useState("search");
  const [checkinForm, setCheckinForm] = useState({ email: "", nome: "" });
  const [checkinResult, setCheckinResult] = useState(null);

  const [modalConfig, setModalConfig] = useState(null);

  // --- Handlers de Dados ---
  const updateLocalData = async () => {
    try {
      const res = await window.api.offline.buscarDadosLocais();
      if (res?.success) {
        setLocalData({
          eventos: res.eventos || [],
          inscricoes: res.inscricoes || [],
          presencas: res.presencas || [],
          usuarios: res.usuarios || [] 
        });
      }
    } catch (e) { console.error(e); }
  };

  // --- Handlers Online ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await window.api.online.login(loginForm.username, loginForm.password);
      if (res?.success) {
        setAtendente(res.user);
        setAppState(AppState.ONLINE);
        setMessage("");
      } else {
        setMessage(res?.message || "Credenciais inválidas.");
      }
    } catch (err) { setMessage("Erro de conexão."); } finally { setLoading(false); }
  };

  const handleSyncFull = async () => {
    setLoading(true);
    setMessage("Processando sincronização...");

    try {
      const up = await window.api.online.sincronizarUpload();
      const down = await window.api.online.sincronizarDownload();

      if(up.success && down.success) {
        // Atualiza a tela
        await updateLocalData();

        // 3. Cria Mensagem Personalizada (JSX)
        setMessage(
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-bold text-green-700">
              <CheckCircle2 size={18} />
              <span>Sincronização Concluída com Sucesso!</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-1">
              {/* Coluna Upload */}
              <div className="bg-white p-2 rounded border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Enviado para Nuvem</p>
                <ul className="space-y-0.5 text-slate-600">
                  <li>• <b>{up.checkins}</b> Presenças/Check-ins</li>
                  <li>• <b>{up.users}</b> Novos Usuários</li>
                  <li>• <b>{up.subs}</b> Novas Inscrições</li>
                  {up.deletes > 0 && <li className="text-red-500">• <b>{up.deletes}</b> Cancelamentos</li>}
                </ul>
              </div>

              {/* Coluna Download */}
              <div className="bg-white p-2 rounded border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Recebido do Servidor</p>
                <ul className="space-y-0.5 text-slate-600">
                  <li>• <b>{down.events}</b> Eventos Atualizados</li>
                  <li>• <b>{down.subs}</b> Inscrições Baixadas</li>
                </ul>
              </div>
            </div>
          </div>
        );
      } else { 
        // Tratamento de Erro Bonito
        const erroMsg = up.message || down.message || "Erro desconhecido ao comunicar com servidor.";
        console.error("[RENDERER] Sync Falhou:", erroMsg);
        
        setMessage(
          <div className="flex items-start gap-2 text-red-700">
             <AlertCircle size={18} className="mt-0.5" />
             <div className="flex flex-col">
               <span className="font-bold">Falha na Sincronização</span>
               <span className="text-sm opacity-90">{erroMsg}</span>
               <span className="text-xs mt-1 opacity-70">Verifique sua conexão ou contate o suporte.</span>
             </div>
          </div>
        ); 
      }

    } catch (err) { 
      setMessage(
        <span className="flex items-center gap-2 text-red-600 font-bold">
          <WifiOff size={18} /> Erro Crítico de Rede: {err.message}
        </span>
      );
    } finally { 
      setLoading(false);
      setTimeout(() => setMessage(""), 30000);
    }
  };

  const handleBackToOnline = async () => {
    setLoading(true);
    try {
      const res = await window.api.online.sincronizarDownload();
      if (res.success) {
        setAppState(AppState.ONLINE);
        setMessage("Online novamente.");
        await window.api.online.sincronizarUpload(); // Auto-upload
        await updateLocalData();
      } else { setMessage("Sem conexão."); }
    } catch (err) { setMessage("Sem internet."); } finally { setLoading(false); }
  };

  // --- Handlers Offline ---
  const handleGoOffline = async () => {
    setLoading(true);
    await updateLocalData();
    setAppState(AppState.OFFLINE);
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setCheckinForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchParticipante = async () => {
    if (!checkinForm.email) return;
    setCheckinResult(null); setLoading(true);
    const emailBusca = checkinForm.email.trim().toLowerCase();
    
    // Busca segura (case insensitive)
    const userFound = localData.usuarios?.find(u => u.email && u.email.trim().toLowerCase() === emailBusca);
    const inscricaoFound = localData.inscricoes?.find(i => i.email_usuario && i.email_usuario.trim().toLowerCase() === emailBusca && i.evento_id_server === selectedEventId);

    setLoading(false);

    if (inscricaoFound) {
       setModalConfig({
         title: "Confirmar Check-in",
         message: `Participante ${inscricaoFound.nome_usuario} já inscrito. Realizar check-in?`,
         type: "info",
         action: async () => await executeCheckinRapido(inscricaoFound.nome_usuario, checkinForm.email)
       });
    } else if (userFound) {
       setModalConfig({
         title: "Inscrever Participante",
         message: `Usuário ${userFound.nome} encontrado. Inscrever e fazer check-in?`,
         type: "info",
         action: async () => await executeCheckinRapido(userFound.nome, checkinForm.email)
       });
    } else {
       setCheckinForm(prev => ({ ...prev, email: checkinForm.email }));
       setCheckinStep("register");
    }
  };

  const executeModalAction = async () => {
      if (modalConfig?.action) {
          await modalConfig.action();
      }
      setModalConfig(null);
  };

  const executeCheckinRapido = async (nome, email) => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await window.api.realizarCheckinRapido({ nome, email, eventoIdServer: selectedEventId });
      if (res.success) {
        setCheckinStep("success");
        setCheckinResult({ nome, email, senhaTemp: res.senhaTemp });
        await updateLocalData();
      } else { setMessage("Erro: " + res.message); }
    } catch (e) { setMessage("Erro crítico."); } finally { setLoading(false); }
  };

  const resetCheckin = () => {
    setCheckinForm({ email: "", nome: "" });
    setCheckinStep("search");
    setCheckinResult(null);
    setMessage("");
  };

  /* ============================================================
   * RENDERIZAÇÃO
   * ============================================================ */

  // TELA DE LOGIN
  if (appState === AppState.LOGGED_OUT) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg border-0">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" zoomAndPan="magnify" viewBox="0 0 375 374.999991" height="500" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><g/><clipPath id="e6539daf87"><rect x="0" width="160" y="0" height="37"/></clipPath><clipPath id="826319c79b"><rect x="0" width="173" y="0" height="178"/></clipPath><clipPath id="4941432db5"><path d="M 27 111.207031 L 158 111.207031 L 158 178 L 27 178 Z M 27 111.207031 " clip-rule="nonzero"/></clipPath></defs><g transform="matrix(1, 0, 0, 1, 168, 92)"><g clip-path="url(#e6539daf87)"><g fill="#2684ff" fill-opacity="1"><g transform="translate(1.093074, 28.716746)"><g><path d="M 20.375 -20.40625 L 20.375 0 L 18.609375 0 L 5.484375 -16.5625 L 5.484375 0 L 3.328125 0 L 3.328125 -20.40625 L 5.109375 -20.40625 L 18.25 -3.84375 L 18.25 -20.40625 Z M 20.375 -20.40625 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(24.787476, 28.716746)"><g><path d="M 17.75 -1.859375 L 17.75 0 L 3.328125 0 L 3.328125 -20.40625 L 17.3125 -20.40625 L 17.3125 -18.546875 L 5.484375 -18.546875 L 5.484375 -11.28125 L 16.03125 -11.28125 L 16.03125 -9.453125 L 5.484375 -9.453125 L 5.484375 -1.859375 Z M 17.75 -1.859375 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(44.022727, 28.716746)"><g><path d="M 16.125 0 L 9.53125 -8.984375 L 2.96875 0 L 0.5 0 L 8.25 -10.5 L 0.984375 -20.40625 L 3.46875 -20.40625 L 9.625 -12.078125 L 15.75 -20.40625 L 18.078125 -20.40625 L 10.84375 -10.546875 L 18.625 0 Z M 16.125 0 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(62.733347, 28.716746)"><g><path d="M 8.953125 0.171875 C 7.429688 0.171875 5.972656 -0.0664062 4.578125 -0.546875 C 3.191406 -1.035156 2.125 -1.679688 1.375 -2.484375 L 2.21875 -4.140625 C 2.957031 -3.398438 3.9375 -2.800781 5.15625 -2.34375 C 6.382812 -1.882812 7.648438 -1.65625 8.953125 -1.65625 C 10.773438 -1.65625 12.144531 -1.988281 13.0625 -2.65625 C 13.976562 -3.332031 14.4375 -4.207031 14.4375 -5.28125 C 14.4375 -6.09375 14.1875 -6.738281 13.6875 -7.21875 C 13.195312 -7.707031 12.585938 -8.082031 11.859375 -8.34375 C 11.140625 -8.613281 10.140625 -8.90625 8.859375 -9.21875 C 7.328125 -9.601562 6.101562 -9.972656 5.1875 -10.328125 C 4.269531 -10.691406 3.484375 -11.242188 2.828125 -11.984375 C 2.179688 -12.722656 1.859375 -13.722656 1.859375 -14.984375 C 1.859375 -16.015625 2.128906 -16.953125 2.671875 -17.796875 C 3.222656 -18.640625 4.0625 -19.3125 5.1875 -19.8125 C 6.3125 -20.320312 7.710938 -20.578125 9.390625 -20.578125 C 10.554688 -20.578125 11.695312 -20.414062 12.8125 -20.09375 C 13.925781 -19.78125 14.894531 -19.34375 15.71875 -18.78125 L 14.984375 -17.0625 C 14.128906 -17.625 13.210938 -18.046875 12.234375 -18.328125 C 11.265625 -18.609375 10.316406 -18.75 9.390625 -18.75 C 7.597656 -18.75 6.25 -18.398438 5.34375 -17.703125 C 4.445312 -17.015625 4 -16.128906 4 -15.046875 C 4 -14.222656 4.242188 -13.5625 4.734375 -13.0625 C 5.234375 -12.570312 5.851562 -12.195312 6.59375 -11.9375 C 7.34375 -11.675781 8.351562 -11.390625 9.625 -11.078125 C 11.113281 -10.710938 12.320312 -10.347656 13.25 -9.984375 C 14.175781 -9.628906 14.957031 -9.085938 15.59375 -8.359375 C 16.238281 -7.628906 16.5625 -6.640625 16.5625 -5.390625 C 16.5625 -4.359375 16.285156 -3.421875 15.734375 -2.578125 C 15.179688 -1.734375 14.328125 -1.0625 13.171875 -0.5625 C 12.023438 -0.0703125 10.617188 0.171875 8.953125 0.171875 Z M 8.953125 0.171875 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(80.36566, 28.716746)"><g><path d="M 7.28125 -18.546875 L 0.109375 -18.546875 L 0.109375 -20.40625 L 16.625 -20.40625 L 16.625 -18.546875 L 9.453125 -18.546875 L 9.453125 0 L 7.28125 0 Z M 7.28125 -18.546875 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(96.074274, 28.716746)"><g><path d="M 16.125 -5.453125 L 4.75 -5.453125 L 2.296875 0 L 0.0625 0 L 9.390625 -20.40625 L 11.515625 -20.40625 L 20.84375 0 L 18.578125 0 Z M 15.34375 -7.203125 L 10.4375 -18.171875 L 5.546875 -7.203125 Z M 15.34375 -7.203125 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(116.679307, 28.716746)"><g><path d="M 17.703125 -10.203125 L 19.765625 -10.203125 L 19.765625 -2.421875 C 18.816406 -1.585938 17.691406 -0.945312 16.390625 -0.5 C 15.085938 -0.0507812 13.71875 0.171875 12.28125 0.171875 C 10.238281 0.171875 8.398438 -0.269531 6.765625 -1.15625 C 5.128906 -2.050781 3.84375 -3.289062 2.90625 -4.875 C 1.976562 -6.46875 1.515625 -8.242188 1.515625 -10.203125 C 1.515625 -12.171875 1.976562 -13.945312 2.90625 -15.53125 C 3.84375 -17.113281 5.128906 -18.347656 6.765625 -19.234375 C 8.398438 -20.128906 10.242188 -20.578125 12.296875 -20.578125 C 13.859375 -20.578125 15.289062 -20.328125 16.59375 -19.828125 C 17.894531 -19.335938 18.992188 -18.609375 19.890625 -17.640625 L 18.546875 -16.265625 C 16.929688 -17.859375 14.878906 -18.65625 12.390625 -18.65625 C 10.734375 -18.65625 9.238281 -18.289062 7.90625 -17.5625 C 6.582031 -16.832031 5.539062 -15.820312 4.78125 -14.53125 C 4.019531 -13.238281 3.640625 -11.796875 3.640625 -10.203125 C 3.640625 -8.609375 4.019531 -7.171875 4.78125 -5.890625 C 5.539062 -4.609375 6.582031 -3.597656 7.90625 -2.859375 C 9.226562 -2.117188 10.710938 -1.75 12.359375 -1.75 C 14.460938 -1.75 16.242188 -2.273438 17.703125 -3.328125 Z M 17.703125 -10.203125 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(139.207925, 28.716746)"><g><path d="M 17.75 -1.859375 L 17.75 0 L 3.328125 0 L 3.328125 -20.40625 L 17.3125 -20.40625 L 17.3125 -18.546875 L 5.484375 -18.546875 L 5.484375 -11.28125 L 16.03125 -11.28125 L 16.03125 -9.453125 L 5.484375 -9.453125 L 5.484375 -1.859375 Z M 17.75 -1.859375 "/></g></g></g></g></g><g transform="matrix(1, 0, 0, 1, 162, 107)"><g clip-path="url(#826319c79b)"><g fill="#ffffff" fill-opacity="1"><g transform="translate(0.590636, 77.195818)"><g><path d="M 5.171875 0 L 5.171875 -60.34375 L 87.96875 -60.34375 L 87.96875 -49.203125 L 16.3125 -49.203125 L 16.3125 -38.9375 L 70.4375 -38.9375 L 70.4375 -27.796875 L 16.3125 -27.796875 L 16.3125 -11.140625 L 87.96875 -11.140625 L 87.96875 0 Z M 5.171875 0 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(90.113952, 77.195818)"><g><path d="M 29 -60.515625 L 40.234375 -60.515625 L 32.625 0 L 12.953125 0 L 5.171875 -60.515625 L 16.40625 -60.515625 L 22.796875 -10.96875 Z M 29 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(133.451169, 77.195818)"><g><path d="M 33.75 -49.296875 L 16.3125 -49.296875 L 16.3125 -38.59375 L 28.578125 -38.59375 L 28.578125 -27.453125 L 16.3125 -27.453125 L 16.3125 -11.140625 L 33.75 -11.140625 L 33.75 0 L 5.171875 0 L 5.171875 -60.515625 L 33.75 -60.515625 Z M 33.75 -49.296875 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(6.383142, 144.52396)"><g><path d="M 27.96875 -60.515625 L 39.109375 -60.515625 L 39.109375 0 L 27.96875 0 L 16.40625 -30.8125 L 16.40625 0 L 5.265625 0 L 5.265625 -60.34375 L 5.171875 -60.515625 L 17.09375 -60.515625 L 27.96875 -31.515625 Z M 27.96875 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(50.670008, 144.52396)"><g><path d="M 31.25 -60.515625 L 31.25 -49.375 L 23.734375 -49.375 L 23.734375 0 L 12.6875 0 L 12.6875 -49.375 L 5.171875 -49.375 L 5.171875 -60.515625 Z M 31.25 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(83.734057, 144.52396)"><g><path d="M 20.109375 -60.515625 C 23.566406 -60.515625 26.660156 -59.191406 29.390625 -56.546875 C 32.128906 -53.898438 34.289062 -50.285156 35.875 -45.703125 C 37.457031 -41.128906 38.25 -35.96875 38.25 -30.21875 C 38.25 -24.457031 37.457031 -19.300781 35.875 -14.75 C 34.289062 -10.207031 32.128906 -6.613281 29.390625 -3.96875 C 26.660156 -1.320312 23.566406 0 20.109375 0 C 16.660156 0 13.566406 -1.320312 10.828125 -3.96875 C 8.097656 -6.613281 5.941406 -10.207031 4.359375 -14.75 C 2.773438 -19.300781 1.984375 -24.457031 1.984375 -30.21875 C 1.984375 -35.96875 2.773438 -41.128906 4.359375 -45.703125 C 5.941406 -50.285156 8.097656 -53.898438 10.828125 -56.546875 C 13.566406 -59.191406 16.660156 -60.515625 20.109375 -60.515625 Z M 20.109375 -11.140625 C 20.804688 -11.140625 21.703125 -11.867188 22.796875 -13.328125 C 23.890625 -14.796875 24.878906 -16.953125 25.765625 -19.796875 C 26.660156 -22.648438 27.109375 -26.125 27.109375 -30.21875 C 27.109375 -34.363281 26.660156 -37.859375 25.765625 -40.703125 C 24.878906 -43.554688 23.890625 -45.710938 22.796875 -47.171875 C 21.703125 -48.640625 20.804688 -49.375 20.109375 -49.375 C 19.421875 -49.375 18.53125 -48.640625 17.4375 -47.171875 C 16.34375 -45.710938 15.347656 -43.554688 14.453125 -40.703125 C 13.566406 -37.859375 13.125 -34.363281 13.125 -30.21875 C 13.125 -26.125 13.566406 -22.648438 14.453125 -19.796875 C 15.347656 -16.953125 16.34375 -14.796875 17.4375 -13.328125 C 18.53125 -11.867188 19.421875 -11.140625 20.109375 -11.140625 Z M 20.109375 -11.140625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(123.963453, 144.52396)"><g><path d="M 24.078125 -35.90625 C 26.035156 -34.582031 28.035156 -33.054688 30.078125 -31.328125 C 32.128906 -29.609375 33.84375 -27.367188 35.21875 -24.609375 C 36.769531 -21.554688 37.414062 -18.300781 37.15625 -14.84375 C 36.90625 -11.394531 35.828125 -8.40625 33.921875 -5.875 C 31.109375 -1.957031 27.222656 0 22.265625 0 C 21.347656 0 20.429688 -0.0859375 19.515625 -0.265625 C 18.191406 -0.492188 16.75 -0.9375 15.1875 -1.59375 C 13.632812 -2.257812 12.125 -3.328125 10.65625 -4.796875 C 9.1875 -6.265625 7.945312 -8.265625 6.9375 -10.796875 C 5.9375 -13.328125 5.378906 -16.546875 5.265625 -20.453125 L 16.40625 -20.453125 C 16.519531 -17.640625 16.890625 -15.597656 17.515625 -14.328125 C 18.148438 -13.066406 18.828125 -12.25 19.546875 -11.875 C 20.265625 -11.5 20.859375 -11.28125 21.328125 -11.21875 C 22.421875 -11.050781 23.238281 -11.125 23.78125 -11.4375 C 24.332031 -11.75 24.75 -12.082031 25.03125 -12.4375 C 25.601562 -13.238281 25.945312 -14.316406 26.0625 -15.671875 C 26.1875 -17.023438 25.929688 -18.363281 25.296875 -19.6875 C 24.546875 -21.175781 23.507812 -22.453125 22.1875 -23.515625 C 20.863281 -24.585938 19.394531 -25.671875 17.78125 -26.765625 C 17.03125 -27.273438 16.253906 -27.816406 15.453125 -28.390625 C 14.648438 -28.972656 13.84375 -29.582031 13.03125 -30.21875 C 9.46875 -33.15625 7.109375 -36.4375 5.953125 -40.0625 C 4.804688 -43.6875 4.953125 -47.335938 6.390625 -51.015625 C 7.484375 -53.722656 9.09375 -55.882812 11.21875 -57.5 C 13.0625 -58.820312 15.265625 -59.726562 17.828125 -60.21875 C 20.390625 -60.707031 22.960938 -60.660156 25.546875 -60.078125 C 28.140625 -59.503906 30.359375 -58.296875 32.203125 -56.453125 C 35.535156 -53.171875 37.289062 -48.597656 37.46875 -42.734375 L 26.328125 -42.734375 C 26.273438 -44.109375 26.003906 -45.472656 25.515625 -46.828125 C 25.023438 -48.179688 24.03125 -49.03125 22.53125 -49.375 C 21.4375 -49.664062 20.3125 -49.609375 19.15625 -49.203125 C 18.007812 -48.804688 17.207031 -48.03125 16.75 -46.875 C 16.570312 -46.53125 16.425781 -45.984375 16.3125 -45.234375 C 16.195312 -44.484375 16.382812 -43.5625 16.875 -42.46875 C 17.363281 -41.375 18.441406 -40.164062 20.109375 -38.84375 C 20.742188 -38.332031 21.390625 -37.84375 22.046875 -37.375 C 22.710938 -36.914062 23.390625 -36.425781 24.078125 -35.90625 Z M 24.078125 -35.90625 "/></g></g></g></g></g><path fill="#2684ff" d="M 24.074219 224.652344 L 52.199219 241.992188 C 54.242188 243.238281 56.902344 242.632812 58.148438 240.589844 C 58.148438 240.558594 58.175781 240.539062 58.175781 240.539062 C 75.996094 210.699219 79.554688 215.03125 132.769531 240.347656 C 134.921875 241.390625 137.496094 240.457031 138.53125 238.300781 C 138.558594 238.273438 138.558594 238.222656 138.582031 238.191406 L 151.96875 207.851562 C 152.925781 205.695312 151.9375 203.167969 149.8125 202.1875 C 143.917969 199.421875 132.230469 193.894531 121.691406 188.8125 C 55.863281 156.726562 33.847656 200.960938 22.613281 218.75 L 22.613281 218.746094 C 21.417969 220.765625 22.058594 223.398438 24.074219 224.652344 Z M 24.074219 224.652344 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#4941432db5)"><path fill="#2684ff" d="M 157.359375 135.738281 C 158.554688 133.71875 157.914062 131.085938 155.898438 129.832031 L 127.800781 112.515625 C 125.808594 111.1875 123.128906 111.6875 121.804688 113.679688 C 121.753906 113.761719 121.695312 113.839844 121.644531 113.949219 C 103.769531 143.894531 100.101562 139.375 47.128906 114.1875 C 44.976562 113.152344 42.40625 114.078125 41.367188 116.234375 C 41.339844 116.265625 41.339844 116.316406 41.316406 116.34375 L 27.90625 146.6875 C 26.945312 148.84375 27.933594 151.367188 30.058594 152.347656 C 35.953125 155.117188 47.667969 160.648438 58.210938 165.757812 C 124.070312 197.671875 146.054688 153.683594 157.371094 135.734375 Z M 157.359375 135.738281 " fill-opacity="1" fill-rule="nonzero"/></g></svg>
            </div>
            <CardTitle className="text-2xl">Acesso atendente</CardTitle>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Sistema de Eventos</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username: e.target.value})} placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password: e.target.value})} placeholder="••••••" />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                {loading ? "Entrando..." : "Acessar painel"}
              </Button>
            </form>
            {message && <p className="text-xs text-red-500 mt-4 text-center bg-red-50 p-2 rounded">{message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // HEADER COMPARTILHADO
  const Header = () => (
    <header className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="500" zoomAndPan="magnify" viewBox="0 0 375 374.999991" height="500" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><g/><clipPath id="e6539daf87"><rect x="0" width="160" y="0" height="37"/></clipPath><clipPath id="826319c79b"><rect x="0" width="173" y="0" height="178"/></clipPath><clipPath id="4941432db5"><path d="M 27 111.207031 L 158 111.207031 L 158 178 L 27 178 Z M 27 111.207031 " clip-rule="nonzero"/></clipPath></defs><g transform="matrix(1, 0, 0, 1, 168, 92)"><g clip-path="url(#e6539daf87)"><g fill="#2684ff" fill-opacity="1"><g transform="translate(1.093074, 28.716746)"><g><path d="M 20.375 -20.40625 L 20.375 0 L 18.609375 0 L 5.484375 -16.5625 L 5.484375 0 L 3.328125 0 L 3.328125 -20.40625 L 5.109375 -20.40625 L 18.25 -3.84375 L 18.25 -20.40625 Z M 20.375 -20.40625 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(24.787476, 28.716746)"><g><path d="M 17.75 -1.859375 L 17.75 0 L 3.328125 0 L 3.328125 -20.40625 L 17.3125 -20.40625 L 17.3125 -18.546875 L 5.484375 -18.546875 L 5.484375 -11.28125 L 16.03125 -11.28125 L 16.03125 -9.453125 L 5.484375 -9.453125 L 5.484375 -1.859375 Z M 17.75 -1.859375 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(44.022727, 28.716746)"><g><path d="M 16.125 0 L 9.53125 -8.984375 L 2.96875 0 L 0.5 0 L 8.25 -10.5 L 0.984375 -20.40625 L 3.46875 -20.40625 L 9.625 -12.078125 L 15.75 -20.40625 L 18.078125 -20.40625 L 10.84375 -10.546875 L 18.625 0 Z M 16.125 0 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(62.733347, 28.716746)"><g><path d="M 8.953125 0.171875 C 7.429688 0.171875 5.972656 -0.0664062 4.578125 -0.546875 C 3.191406 -1.035156 2.125 -1.679688 1.375 -2.484375 L 2.21875 -4.140625 C 2.957031 -3.398438 3.9375 -2.800781 5.15625 -2.34375 C 6.382812 -1.882812 7.648438 -1.65625 8.953125 -1.65625 C 10.773438 -1.65625 12.144531 -1.988281 13.0625 -2.65625 C 13.976562 -3.332031 14.4375 -4.207031 14.4375 -5.28125 C 14.4375 -6.09375 14.1875 -6.738281 13.6875 -7.21875 C 13.195312 -7.707031 12.585938 -8.082031 11.859375 -8.34375 C 11.140625 -8.613281 10.140625 -8.90625 8.859375 -9.21875 C 7.328125 -9.601562 6.101562 -9.972656 5.1875 -10.328125 C 4.269531 -10.691406 3.484375 -11.242188 2.828125 -11.984375 C 2.179688 -12.722656 1.859375 -13.722656 1.859375 -14.984375 C 1.859375 -16.015625 2.128906 -16.953125 2.671875 -17.796875 C 3.222656 -18.640625 4.0625 -19.3125 5.1875 -19.8125 C 6.3125 -20.320312 7.710938 -20.578125 9.390625 -20.578125 C 10.554688 -20.578125 11.695312 -20.414062 12.8125 -20.09375 C 13.925781 -19.78125 14.894531 -19.34375 15.71875 -18.78125 L 14.984375 -17.0625 C 14.128906 -17.625 13.210938 -18.046875 12.234375 -18.328125 C 11.265625 -18.609375 10.316406 -18.75 9.390625 -18.75 C 7.597656 -18.75 6.25 -18.398438 5.34375 -17.703125 C 4.445312 -17.015625 4 -16.128906 4 -15.046875 C 4 -14.222656 4.242188 -13.5625 4.734375 -13.0625 C 5.234375 -12.570312 5.851562 -12.195312 6.59375 -11.9375 C 7.34375 -11.675781 8.351562 -11.390625 9.625 -11.078125 C 11.113281 -10.710938 12.320312 -10.347656 13.25 -9.984375 C 14.175781 -9.628906 14.957031 -9.085938 15.59375 -8.359375 C 16.238281 -7.628906 16.5625 -6.640625 16.5625 -5.390625 C 16.5625 -4.359375 16.285156 -3.421875 15.734375 -2.578125 C 15.179688 -1.734375 14.328125 -1.0625 13.171875 -0.5625 C 12.023438 -0.0703125 10.617188 0.171875 8.953125 0.171875 Z M 8.953125 0.171875 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(80.36566, 28.716746)"><g><path d="M 7.28125 -18.546875 L 0.109375 -18.546875 L 0.109375 -20.40625 L 16.625 -20.40625 L 16.625 -18.546875 L 9.453125 -18.546875 L 9.453125 0 L 7.28125 0 Z M 7.28125 -18.546875 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(96.074274, 28.716746)"><g><path d="M 16.125 -5.453125 L 4.75 -5.453125 L 2.296875 0 L 0.0625 0 L 9.390625 -20.40625 L 11.515625 -20.40625 L 20.84375 0 L 18.578125 0 Z M 15.34375 -7.203125 L 10.4375 -18.171875 L 5.546875 -7.203125 Z M 15.34375 -7.203125 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(116.679307, 28.716746)"><g><path d="M 17.703125 -10.203125 L 19.765625 -10.203125 L 19.765625 -2.421875 C 18.816406 -1.585938 17.691406 -0.945312 16.390625 -0.5 C 15.085938 -0.0507812 13.71875 0.171875 12.28125 0.171875 C 10.238281 0.171875 8.398438 -0.269531 6.765625 -1.15625 C 5.128906 -2.050781 3.84375 -3.289062 2.90625 -4.875 C 1.976562 -6.46875 1.515625 -8.242188 1.515625 -10.203125 C 1.515625 -12.171875 1.976562 -13.945312 2.90625 -15.53125 C 3.84375 -17.113281 5.128906 -18.347656 6.765625 -19.234375 C 8.398438 -20.128906 10.242188 -20.578125 12.296875 -20.578125 C 13.859375 -20.578125 15.289062 -20.328125 16.59375 -19.828125 C 17.894531 -19.335938 18.992188 -18.609375 19.890625 -17.640625 L 18.546875 -16.265625 C 16.929688 -17.859375 14.878906 -18.65625 12.390625 -18.65625 C 10.734375 -18.65625 9.238281 -18.289062 7.90625 -17.5625 C 6.582031 -16.832031 5.539062 -15.820312 4.78125 -14.53125 C 4.019531 -13.238281 3.640625 -11.796875 3.640625 -10.203125 C 3.640625 -8.609375 4.019531 -7.171875 4.78125 -5.890625 C 5.539062 -4.609375 6.582031 -3.597656 7.90625 -2.859375 C 9.226562 -2.117188 10.710938 -1.75 12.359375 -1.75 C 14.460938 -1.75 16.242188 -2.273438 17.703125 -3.328125 Z M 17.703125 -10.203125 "/></g></g></g><g fill="#2684ff" fill-opacity="1"><g transform="translate(139.207925, 28.716746)"><g><path d="M 17.75 -1.859375 L 17.75 0 L 3.328125 0 L 3.328125 -20.40625 L 17.3125 -20.40625 L 17.3125 -18.546875 L 5.484375 -18.546875 L 5.484375 -11.28125 L 16.03125 -11.28125 L 16.03125 -9.453125 L 5.484375 -9.453125 L 5.484375 -1.859375 Z M 17.75 -1.859375 "/></g></g></g></g></g><g transform="matrix(1, 0, 0, 1, 162, 107)"><g clip-path="url(#826319c79b)"><g fill="#ffffff" fill-opacity="1"><g transform="translate(0.590636, 77.195818)"><g><path d="M 5.171875 0 L 5.171875 -60.34375 L 87.96875 -60.34375 L 87.96875 -49.203125 L 16.3125 -49.203125 L 16.3125 -38.9375 L 70.4375 -38.9375 L 70.4375 -27.796875 L 16.3125 -27.796875 L 16.3125 -11.140625 L 87.96875 -11.140625 L 87.96875 0 Z M 5.171875 0 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(90.113952, 77.195818)"><g><path d="M 29 -60.515625 L 40.234375 -60.515625 L 32.625 0 L 12.953125 0 L 5.171875 -60.515625 L 16.40625 -60.515625 L 22.796875 -10.96875 Z M 29 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(133.451169, 77.195818)"><g><path d="M 33.75 -49.296875 L 16.3125 -49.296875 L 16.3125 -38.59375 L 28.578125 -38.59375 L 28.578125 -27.453125 L 16.3125 -27.453125 L 16.3125 -11.140625 L 33.75 -11.140625 L 33.75 0 L 5.171875 0 L 5.171875 -60.515625 L 33.75 -60.515625 Z M 33.75 -49.296875 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(6.383142, 144.52396)"><g><path d="M 27.96875 -60.515625 L 39.109375 -60.515625 L 39.109375 0 L 27.96875 0 L 16.40625 -30.8125 L 16.40625 0 L 5.265625 0 L 5.265625 -60.34375 L 5.171875 -60.515625 L 17.09375 -60.515625 L 27.96875 -31.515625 Z M 27.96875 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(50.670008, 144.52396)"><g><path d="M 31.25 -60.515625 L 31.25 -49.375 L 23.734375 -49.375 L 23.734375 0 L 12.6875 0 L 12.6875 -49.375 L 5.171875 -49.375 L 5.171875 -60.515625 Z M 31.25 -60.515625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(83.734057, 144.52396)"><g><path d="M 20.109375 -60.515625 C 23.566406 -60.515625 26.660156 -59.191406 29.390625 -56.546875 C 32.128906 -53.898438 34.289062 -50.285156 35.875 -45.703125 C 37.457031 -41.128906 38.25 -35.96875 38.25 -30.21875 C 38.25 -24.457031 37.457031 -19.300781 35.875 -14.75 C 34.289062 -10.207031 32.128906 -6.613281 29.390625 -3.96875 C 26.660156 -1.320312 23.566406 0 20.109375 0 C 16.660156 0 13.566406 -1.320312 10.828125 -3.96875 C 8.097656 -6.613281 5.941406 -10.207031 4.359375 -14.75 C 2.773438 -19.300781 1.984375 -24.457031 1.984375 -30.21875 C 1.984375 -35.96875 2.773438 -41.128906 4.359375 -45.703125 C 5.941406 -50.285156 8.097656 -53.898438 10.828125 -56.546875 C 13.566406 -59.191406 16.660156 -60.515625 20.109375 -60.515625 Z M 20.109375 -11.140625 C 20.804688 -11.140625 21.703125 -11.867188 22.796875 -13.328125 C 23.890625 -14.796875 24.878906 -16.953125 25.765625 -19.796875 C 26.660156 -22.648438 27.109375 -26.125 27.109375 -30.21875 C 27.109375 -34.363281 26.660156 -37.859375 25.765625 -40.703125 C 24.878906 -43.554688 23.890625 -45.710938 22.796875 -47.171875 C 21.703125 -48.640625 20.804688 -49.375 20.109375 -49.375 C 19.421875 -49.375 18.53125 -48.640625 17.4375 -47.171875 C 16.34375 -45.710938 15.347656 -43.554688 14.453125 -40.703125 C 13.566406 -37.859375 13.125 -34.363281 13.125 -30.21875 C 13.125 -26.125 13.566406 -22.648438 14.453125 -19.796875 C 15.347656 -16.953125 16.34375 -14.796875 17.4375 -13.328125 C 18.53125 -11.867188 19.421875 -11.140625 20.109375 -11.140625 Z M 20.109375 -11.140625 "/></g></g></g><g fill="#ffffff" fill-opacity="1"><g transform="translate(123.963453, 144.52396)"><g><path d="M 24.078125 -35.90625 C 26.035156 -34.582031 28.035156 -33.054688 30.078125 -31.328125 C 32.128906 -29.609375 33.84375 -27.367188 35.21875 -24.609375 C 36.769531 -21.554688 37.414062 -18.300781 37.15625 -14.84375 C 36.90625 -11.394531 35.828125 -8.40625 33.921875 -5.875 C 31.109375 -1.957031 27.222656 0 22.265625 0 C 21.347656 0 20.429688 -0.0859375 19.515625 -0.265625 C 18.191406 -0.492188 16.75 -0.9375 15.1875 -1.59375 C 13.632812 -2.257812 12.125 -3.328125 10.65625 -4.796875 C 9.1875 -6.265625 7.945312 -8.265625 6.9375 -10.796875 C 5.9375 -13.328125 5.378906 -16.546875 5.265625 -20.453125 L 16.40625 -20.453125 C 16.519531 -17.640625 16.890625 -15.597656 17.515625 -14.328125 C 18.148438 -13.066406 18.828125 -12.25 19.546875 -11.875 C 20.265625 -11.5 20.859375 -11.28125 21.328125 -11.21875 C 22.421875 -11.050781 23.238281 -11.125 23.78125 -11.4375 C 24.332031 -11.75 24.75 -12.082031 25.03125 -12.4375 C 25.601562 -13.238281 25.945312 -14.316406 26.0625 -15.671875 C 26.1875 -17.023438 25.929688 -18.363281 25.296875 -19.6875 C 24.546875 -21.175781 23.507812 -22.453125 22.1875 -23.515625 C 20.863281 -24.585938 19.394531 -25.671875 17.78125 -26.765625 C 17.03125 -27.273438 16.253906 -27.816406 15.453125 -28.390625 C 14.648438 -28.972656 13.84375 -29.582031 13.03125 -30.21875 C 9.46875 -33.15625 7.109375 -36.4375 5.953125 -40.0625 C 4.804688 -43.6875 4.953125 -47.335938 6.390625 -51.015625 C 7.484375 -53.722656 9.09375 -55.882812 11.21875 -57.5 C 13.0625 -58.820312 15.265625 -59.726562 17.828125 -60.21875 C 20.390625 -60.707031 22.960938 -60.660156 25.546875 -60.078125 C 28.140625 -59.503906 30.359375 -58.296875 32.203125 -56.453125 C 35.535156 -53.171875 37.289062 -48.597656 37.46875 -42.734375 L 26.328125 -42.734375 C 26.273438 -44.109375 26.003906 -45.472656 25.515625 -46.828125 C 25.023438 -48.179688 24.03125 -49.03125 22.53125 -49.375 C 21.4375 -49.664062 20.3125 -49.609375 19.15625 -49.203125 C 18.007812 -48.804688 17.207031 -48.03125 16.75 -46.875 C 16.570312 -46.53125 16.425781 -45.984375 16.3125 -45.234375 C 16.195312 -44.484375 16.382812 -43.5625 16.875 -42.46875 C 17.363281 -41.375 18.441406 -40.164062 20.109375 -38.84375 C 20.742188 -38.332031 21.390625 -37.84375 22.046875 -37.375 C 22.710938 -36.914062 23.390625 -36.425781 24.078125 -35.90625 Z M 24.078125 -35.90625 "/></g></g></g></g></g><path fill="#2684ff" d="M 24.074219 224.652344 L 52.199219 241.992188 C 54.242188 243.238281 56.902344 242.632812 58.148438 240.589844 C 58.148438 240.558594 58.175781 240.539062 58.175781 240.539062 C 75.996094 210.699219 79.554688 215.03125 132.769531 240.347656 C 134.921875 241.390625 137.496094 240.457031 138.53125 238.300781 C 138.558594 238.273438 138.558594 238.222656 138.582031 238.191406 L 151.96875 207.851562 C 152.925781 205.695312 151.9375 203.167969 149.8125 202.1875 C 143.917969 199.421875 132.230469 193.894531 121.691406 188.8125 C 55.863281 156.726562 33.847656 200.960938 22.613281 218.75 L 22.613281 218.746094 C 21.417969 220.765625 22.058594 223.398438 24.074219 224.652344 Z M 24.074219 224.652344 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#4941432db5)"><path fill="#2684ff" d="M 157.359375 135.738281 C 158.554688 133.71875 157.914062 131.085938 155.898438 129.832031 L 127.800781 112.515625 C 125.808594 111.1875 123.128906 111.6875 121.804688 113.679688 C 121.753906 113.761719 121.695312 113.839844 121.644531 113.949219 C 103.769531 143.894531 100.101562 139.375 47.128906 114.1875 C 44.976562 113.152344 42.40625 114.078125 41.367188 116.234375 C 41.339844 116.265625 41.339844 116.316406 41.316406 116.34375 L 27.90625 146.6875 C 26.945312 148.84375 27.933594 151.367188 30.058594 152.347656 C 35.953125 155.117188 47.667969 160.648438 58.210938 165.757812 C 124.070312 197.671875 146.054688 153.683594 157.371094 135.734375 Z M 157.359375 135.738281 " fill-opacity="1" fill-rule="nonzero"/></g></svg>
        </div>
        <div>
          <h1 className="font-bold text-slate-800 leading-tight text-sm">NexStage</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${appState === AppState.ONLINE ? 'bg-green-500' : 'bg-amber-500'}`} />
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {appState === AppState.ONLINE ? "Online" : "Modo Offline"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {appState === AppState.OFFLINE && <SyncStatusBadge data={localData} />}
        <Button variant="ghost" size="icon" onClick={() => { setAppState(AppState.LOGGED_OUT); setAtendente(null); }} title="Sair">
          <LogOut className="text-slate-400 hover:text-red-500 transition-colors" size={18} />
        </Button>
      </div>
    </header>
  );

  // TELA ONLINE
  if (appState === AppState.ONLINE) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
          <Card className="border-blue-100 shadow-md">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Wifi className="h-5 w-5 text-blue-600" /> Painel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                 <Button onClick={handleSyncFull} disabled={loading} size="lg" className="h-20 text-lg bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 shadow-sm transition-all flex flex-col gap-1 items-center justify-center">
                    <Upload className="h-6 w-6 mt-2 mb-2" />
                    <span className="font-bold">Sincronizar</span>
                    <span className="text-xs font-normal text-slate-400">Upload & Download</span>
                 </Button>

                 <Button onClick={handleGoOffline} disabled={loading} size="lg" className="h-20 text-lg bg-white border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 text-slate-700 hover:text-amber-700 shadow-sm transition-all flex flex-col gap-1 items-center justify-center">
                    <WifiOff className="h-6 w-6 mt-2 mb-2" />
                    <span className="font-bold">Attendance</span>
                    <span className="text-xs font-normal text-slate-400">Modo Offline | Faça a sincronização</span>
                 </Button>
              </div>
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6"
                  >
                    <Alert className={`border shadow-sm ${
                      // Detecta se é erro (gambiarra visual simples baseada no conteúdo React) ou sucesso
                      // Se for objeto React, assumimos neutro/sucesso, o estilo interno define as cores.
                      // Mas podemos deixar o container neutro (slate-50)
                      "bg-slate-50 border-slate-200"
                    }`}>
                      <AlertDescription className="w-full">
                        {/* Renderiza o JSX que criamos na função acima */}
                        {message}
                      </AlertDescription>
                      
                      {/* Botãozinho X para fechar msg manual */}
                      <button 
                        onClick={() => setMessage("")}
                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // TELA OFFLINE (Principal)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      {/* MODAL DE CONFIRMAÇÃO (OVERLAY) */}
      <ConfirmationModal 
        isOpen={!!modalConfig}
        title={modalConfig?.title}
        message={modalConfig?.message}
        type={modalConfig?.type}
        onConfirm={executeModalAction}
        onCancel={() => setModalConfig(null)}
      />
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full grid lg:grid-cols-[350px_1fr] gap-6 items-start">
        <div className="space-y-6 sticky top-24">
          <Button onClick={handleBackToOnline} variant="outline" className="w-full border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"><Wifi size={16} className="mr-2"/> {loading ? "..." : "Voltar online"}</Button>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Evento Ativo</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              {localData.eventos.length === 0 ? <div className="text-sm text-red-500 bg-red-50 p-3 rounded">Sem eventos. Sincronize.</div> : (
                <div className="space-y-2">
                  {localData.eventos.map(evt => (
                    <button key={evt.id_server} onClick={() => { setSelectedEventId(evt.id_server); resetCheckin(); }} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium border transition-all flex items-center justify-between ${selectedEventId === evt.id_server ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-200 ring-offset-1" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      <span className="truncate">{evt.nome}</span>
                      {selectedEventId === evt.id_server && <CheckCircle2 size={16} className="text-green-400" />}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Área de Check-in */}
          {/* 3. Área de Check-in (Corrigida) */}
          <AnimatePresence mode="wait">
            {selectedEventId && (
              <motion.div 
                initial={{opacity:0, y:10}} 
                animate={{opacity:1, y:0}} 
                exit={{opacity:0, y:10}} 
                key="checkin-box"
              >
                <Card className="border-t-4 border-t-blue-600 shadow-lg overflow-hidden">
                  <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserPlus className="text-blue-600 h-5 w-5"/> 
                      Check-in Rápido
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pt-4">
                    
                    {/* ETAPA 1: BUSCA */}
                    {checkinStep === 'search' && (
                      <form onSubmit={(e) => { e.preventDefault(); handleSearchParticipante(); }} className="space-y-3">
                        <div>
                          <Label className="text-xs text-slate-500 uppercase font-bold">E-mail do Participante</Label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              placeholder="cliente@email.com" 
                              value={checkinForm.email}
                              onChange={e => setCheckinForm({...checkinForm, email: e.target.value})}
                              autoFocus
                              className="text-lg h-11"
                            />
                            <Button type="submit" disabled={loading || !checkinForm.email} className="h-11 w-12 px-0 bg-blue-600 hover:bg-blue-700">
                              <Search className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* ETAPA 2: CADASTRO NOVO */}
                    {checkinStep === 'register' && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                        <Alert className="bg-amber-50 border-amber-200 text-amber-800 py-2">
                           <AlertCircle className="h-4 w-4" />
                           <AlertDescription className="text-xs font-medium">Não encontrado. Cadastre abaixo:</AlertDescription>
                        </Alert>
                        <div className="space-y-3">
                           <div className="space-y-1">
                             <Label>E-mail</Label>
                             <Input value={checkinForm.email} disabled className="bg-slate-100 text-slate-500" />
                           </div>
                           <div className="space-y-1">
                             <Label>Nome Completo</Label>
                             <Input 
                               value={checkinForm.nome} 
                               onChange={e => setCheckinForm({...checkinForm, nome: e.target.value})} 
                               placeholder="Nome do visitante"
                               autoFocus
                               className="h-11"
                             />
                           </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" onClick={resetCheckin} className="flex-1">Cancelar</Button>
                          <Button 
                            onClick={() => executeCheckinRapido(checkinForm.nome, checkinForm.email)} 
                            disabled={!checkinForm.nome || loading}
                            className="flex-[2] bg-green-600 hover:bg-green-700 text-white"
                          >
                            {loading ? "Salvando..." : "Confirmar"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ETAPA 3: SUCESSO */}
                    {checkinStep === 'success' && (
                      <div className="text-center py-6 animate-in zoom-in-95">
                        {/* Ícone de Sucesso */}
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Check size={32} strokeWidth={3} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800">Tudo Certo!</h3>
                        <p className="text-slate-500 text-sm mb-4">
                           {checkinResult?.email || checkinForm.email}
                        </p>

                        {/* BLOCO DA SENHA (AQUI) */}
                        {checkinResult?.senhaTemp && (
                          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mb-6 mx-2 shadow-inner relative">
                            <div className="absolute top-2 right-2 text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">
                              Provisória
                            </div>
                            
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                              Senha de Acesso
                            </p>
                            
                            <div className="text-2xl font-mono font-black text-slate-800 tracking-widest select-all cursor-pointer" title="Clique para selecionar">
                              {checkinResult.senhaTemp}
                            </div>
                            
                            <div className="mt-3 flex items-start justify-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50 p-2 rounded border border-amber-100">
                               <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                               <span>Avise ao participante: anote ou tire foto para acessar o portal.</span>
                            </div>
                          </div>
                        )}

                        <Button onClick={resetCheckin} className="w-full" variant="outline">
                          Próximo Atendimento
                        </Button>
                      </div>
                    )}

                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* COLUNA DIREITA: LISTA GERAL */}
        <div className="space-y-4">
           <div className="flex items-center justify-between pb-2 border-b border-slate-200">
             <h2 className="text-lg font-bold text-slate-800">
               {selectedEventId 
                 ? `Participantes - ${localData.eventos.find(e=>e.id_server===selectedEventId)?.nome}` 
                 : "Selecione um evento ao lado"}
             </h2>
             <span className="text-xs text-slate-400 font-medium">
               Mostrando dados locais
             </span>
           </div>

           {/* LISTA DE CARDS (AQUI ESTÁ A CORREÇÃO PRINCIPAL) */}
           <div className="grid gap-3">
             {selectedEventId && localData.inscricoes.filter(i => i.evento_id_server === selectedEventId).map(insc => {
                 const hasCheckin = localData.presencas.some(p => 
                  p.inscricao_id_local === insc.id_local && p.sync_status !== 'pending_delete'
                 );
                 return (
                   <EventoCard 
                     key={insc.id_local}
                     status={insc.status}
                     evento={{ 
                      nome: insc.nome_usuario || insc.email_usuario, 
                      data_evento: localData.eventos.find(e => e.id_server === selectedEventId)?.data_evento, 
                      descricao: insc.email_usuario 
                     }}
                     inscricao={true}
                     hasCheckin={hasCheckin}
                     
                     // HANDLERS ATUALIZADOS PARA USAR O NOVO MODAL
                     onCheckin={() => { 
                        setLoading(true); 
                        window.api.offline.registrarPresencaLocal(insc.id_local).then(() => updateLocalData()).finally(() => setLoading(false)); 
                     }}
                     
                     onCancelCheckin={() => {
                         setModalConfig({
                             title: "Desfazer Check-in",
                             message: `Deseja remover a presença de ${insc.nome_usuario || 'participante'}?`,
                             type: "danger",
                             action: async () => {
                                 setLoading(true); 
                                 await window.api.offline.cancelarCheckinLocal(insc.id_local);
                                 await updateLocalData();
                                 setLoading(false);
                             }
                         });
                     }}

                     onCancelInscricao={() => {
                         setModalConfig({
                             title: "Cancelar Inscrição",
                             message: "ATENÇÃO: Isso removerá o participante desta lista localmente. Continuar?",
                             type: "danger",
                             action: async () => {
                                 setLoading(true); 
                                 await window.api.offline.cancelarInscricaoLocal(insc.id_local);
                                 await updateLocalData();
                                 setLoading(false);
                             }
                         });
                     }}

                     onSubscribe={(idLocalReativar) => {
                        setLoading(true);
                        if (idLocalReativar) {
                            // Reativar existente
                            window.api.offline.inscreverLocal({ idLocal: idLocalReativar })
                                .then(() => updateLocalData())
                                .finally(() => setLoading(false));
                        } else {
                            // Inscrição Nova (Via busca lateral, já implementado lá)
                            setLoading(false);
                        }
                      }}
                     
                     loading={loading}
                   />
                 );
             })}
             {selectedEventId && localData.inscricoes.filter(i => i.evento_id_server === selectedEventId).length === 0 && <div className="text-center py-8 text-slate-500">Nenhuma inscrição local.<br/><span className="text-xs opacity-70">Use a busca ao lado.</span></div>}
           </div>
        </div>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);