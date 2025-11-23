import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Wifi, WifiOff, Clock } from 'lucide-react';
import api from '../api';

function MonitoramentoAtendentes() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      // Requer ser admin
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error("Erro ao buscar usuários", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    // Atualiza a lista a cada 60s para ver quem ficou offline/online
    const interval = setInterval(fetchUsuarios, 60000);
    return () => clearInterval(interval);
  }, []);

  // Função para determinar status
  const getStatus = (lastHeartbeat) => {
    if (!lastHeartbeat) return 'offline';
    
    const lastSeen = new Date(lastHeartbeat).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - lastSeen) / 1000;

    // Se visto nos últimos 90 segundos (margem de segurança), está Online
    return diffSeconds < 90 ? 'online' : 'offline';
  };

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Nunca acessou";
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  if (loading) return <p className="text-center py-4">Carregando status...</p>;

  // Filtra apenas quem não é superuser (ou mostra todos, depende da sua regra)
  const atendentes = usuarios.filter(u => !u.is_superuser);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <User size={18} /> Monitoramento de Equipe
        </h3>
        <span className="text-xs text-slate-400">Atualização automática</span>
      </div>
      
      <div className="divide-y divide-slate-100">
        {atendentes.length === 0 ? (
            <p className="p-4 text-center text-slate-500 text-sm">Nenhum atendente cadastrado.</p>
        ) : (
            atendentes.map(user => {
                const diffSeconds = (new Date().getTime() - new Date(user.last_heartbeat).getTime()) / 1000;
                
                let statusVisual = 'offline'; // Cinza (Desconectado/Crash)
                let statusTexto = 'Desconectado';
                let statusCor = 'bg-slate-100 text-slate-500';
                let Icon = WifiOff;

                // Lógica de 3 Estados
                if (diffSeconds < 90) {
                    // Recebemos sinal recente
                    if (user.connection_status === 'working_offline') {
                         // Ele mandou aviso que ia ficar offline recentemente
                         statusVisual = 'warning';
                         statusTexto = 'Trabalhando Offline';
                         statusCor = 'bg-amber-100 text-amber-700';
                         Icon = Clock; // Ou um ícone de "Pause"
                    } else {
                         statusVisual = 'online';
                         statusTexto = 'Online';
                         statusCor = 'bg-green-100 text-green-700';
                         Icon = Wifi;
                    }
                } else {
                    // Faz tempo que não ouvimos nada
                    if (user.connection_status === 'working_offline') {
                        // A última coisa que ele disse foi "vou ficar offline".
                        // Então assumimos que ele AINDA está trabalhando offline.
                         statusVisual = 'warning';
                         statusTexto = 'Trabalhando Offline';
                         statusCor = 'bg-amber-100 text-amber-700';
                         Icon = Clock;
                    }
                    // Se o status era 'online' mas parou de responder > 90s, é crash/fechou (Desconectado)
                }

                return (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                {/* Avatar Placeholder */}
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                    {user.full_name ? user.full_name.charAt(0) : user.username.charAt(0)}
                                </div>
                                {/* Bolinha de Status */}
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-1 ${statusCor}`}>
                                    <Icon size={12} />
                                    {statusTexto}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{user.full_name || user.username}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold mb-1 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </div>
                            <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                                <Clock size={10} />
                                {isOnline ? 'Ativo agora' : `Visto: ${formatLastSeen(user.last_heartbeat)}`}
                            </p>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
}

export default MonitoramentoAtendentes;