import React, { useState } from 'react';
import { Button } from './ui/button'; // Supondo shadcn/ui
import { CloudUpload, CheckCircle, AlertCircle } from 'lucide-react'; // Ícones

export function SyncStatus() {
  const [syncState, setSyncState] = useState('idle'); // idle, syncing, success, error
  const [msg, setMsg] = useState('');

  // Alternar Modo
  const toggleMode = async () => {
    if (isOffline) {
      // Tenta voltar online
      console.log("[FRONT] Tentando voltar online...");
      await window.api.online.setModeOnline();
      setIsOffline(false);
    } else {
      // Força offline
      console.log("[FRONT] Forçando modo offline...");
      await window.api.online.setModeOffline();
      setIsOffline(true);
    }
  };

  const handleSync = async () => {
    if (isOffline) return; // Não sincroniza se estiver offline
    
    setSyncState('syncing');
    try {
      const resUp = await window.api.online.sincronizarUpload();
      const resDown = await window.api.online.sincronizarDownload();

      if (resUp.success && resDown.success) {
        setSyncState('success');
        setMsg(`Sync OK: ${resUp.usersSynced} users envi.`);
      } else {
        setSyncState('error');
        setMsg(resUp.message || resDown.message);
      }
    } catch (error) {
      setSyncState('error');
      setMsg('Erro de conexão.');
    }
    setTimeout(() => setSyncState('idle'), 5000);
  };

  return (
    <div className="flex items-center gap-4 p-2 bg-slate-100 rounded-lg border">
      
      {/* Botão de Toggle Online/Offline */}
      <Button 
        variant={isOffline ? "destructive" : "secondary"} // Vermelho se offline, Cinza se online
        size="sm"
        onClick={toggleMode}
        title={isOffline ? "Clique para reconectar" : "Clique para trabalhar offline"}
      >
        {isOffline ? <WifiOff className="mr-2 h-4 w-4" /> : <Wifi className="mr-2 h-4 w-4" />}
        {isOffline ? "Modo Offline" : "Online"}
      </Button>

      <div className="flex-1 text-sm text-slate-600">
        {syncState === 'syncing' && "Sincronizando..."}
        {syncState === 'success' && <span className="text-green-600">{msg}</span>}
        {syncState === 'error' && <span className="text-red-600">{msg}</span>}
      </div>
      
      <Button 
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isOffline || syncState === 'syncing'}
      >
        <CloudUpload className="mr-2 h-4 w-4" />
        Sync
      </Button>
    </div>
  );
}