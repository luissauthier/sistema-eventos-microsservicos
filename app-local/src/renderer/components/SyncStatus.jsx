import React, { useState } from 'react';
import { Button } from './ui/button'; // Supondo shadcn/ui
import { CloudUpload, CheckCircle, AlertCircle } from 'lucide-react'; // Ícones

export function SyncStatus() {
  const [syncState, setSyncState] = useState('idle'); // idle, syncing, success, error
  const [msg, setMsg] = useState('');

  const handleSync = async () => {
    setSyncState('syncing');
    try {
      // 1. Envia dados locais (Upload)
      const resUp = await window.api.sincronizarUpload();
      
      // 2. Baixa atualizações (Download)
      const resDown = await window.api.sincronizarDownload();

      if (resUp.success && resDown.success) {
        setSyncState('success');
        setMsg(`Enviados: ${resUp.usersSynced} users, ${resUp.checksSynced} presenças.`);
      } else {
        setSyncState('error');
        setMsg(resUp.message || resDown.message);
      }
    } catch (error) {
      setSyncState('error');
      setMsg('Erro de conexão.');
    }
    
    // Limpa mensagem após 5s
    setTimeout(() => setSyncState('idle'), 5000);
  };

  return (
    <div className="flex items-center gap-4 p-2 bg-slate-100 rounded-lg border">
      <div className="flex-1 text-sm text-slate-600">
        {syncState === 'syncing' && "Sincronizando..."}
        {syncState === 'success' && <span className="text-green-600 flex items-center gap-1"><CheckCircle size={16}/> {msg}</span>}
        {syncState === 'error' && <span className="text-red-600 flex items-center gap-1"><AlertCircle size={16}/> {msg}</span>}
        {syncState === 'idle' && "Sistema pronto."}
      </div>
      
      <Button 
        variant={syncState === 'error' ? "destructive" : "outline"}
        size="sm"
        onClick={handleSync}
        disabled={syncState === 'syncing'}
      >
        <CloudUpload className="mr-2 h-4 w-4" />
        Sincronizar Agora
      </Button>
    </div>
  );
}