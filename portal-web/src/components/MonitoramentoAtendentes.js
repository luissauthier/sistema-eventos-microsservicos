import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Wifi, WifiOff, Clock, PauseCircle } from 'lucide-react';
import api from '../api';

function MonitoramentoAtendentes() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
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
    const interval = setInterval(fetchUsuarios, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Nunca acessou";
    const date = new Date(dateStr);
    // Se for hoje, mostra só a hora
    if (date.toDateString() === new Date().toDateString()) {
        return `Hoje às ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    return date.toLocaleString('pt-BR');
  };

  if (loading) return <p className="text-center py-4 text-slate-400 text-sm">Carregando status...</p>;

  const atendentes = usuarios.filter(u => !u.is_superuser);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
            <User size={16} /> Equipe em Tempo Real
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">LIVE</span>
      </div>
      
      <div className="divide-y divide-slate-100">
        {atendentes.length === 0 ? (
            <p className="p-6 text-center text-slate-500 text-sm">Nenhum atendente cadastrado.</p>
        ) : (
            atendentes.map(user => {
                const diffSeconds = user.last_heartbeat 
                    ? (new Date().getTime() - new Date(user.last_heartbeat).getTime()) / 1000 
                    : 99999;
                
                let status = 'offline';
                let label = 'Desconectado';
                let colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
                let Icon = WifiOff;
                let dotColor = 'bg-slate-400';

                // Lógica de 3 Estados
                if (diffSeconds < 90) {
                    if (user.connection_status === 'working_offline') {
                         status = 'warning';
                         label = 'Modo Offline';
                         colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
                         Icon = PauseCircle;
                         dotColor = 'bg-amber-500';
                    } else {
                         status = 'online';
                         label = 'Online';
                         colorClass = 'bg-green-50 text-green-700 border-green-200';
                         Icon = Wifi;
                         dotColor = 'bg-green-500';
                    }
                } else {
                    // Se demorou muito, assume offline mesmo que o status fosse 'working_offline'
                    // Mas podemos manter o status se quisermos saber que ele SAIU intencionalmente
                    if (user.connection_status === 'working_offline' && diffSeconds < 3600) { // Até 1h
                         status = 'warning';
                         label = 'Modo Offline';
                         colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
                         Icon = PauseCircle;
                         dotColor = 'bg-amber-500';
                    }
                }

                return (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        
                        {/* Esquerda: Avatar + Nome */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                    {user.full_name ? user.full_name.charAt(0) : user.username.charAt(0).toUpperCase()}
                                </div>
                                {/* Bolinha de Status no Avatar */}
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${dotColor}`}></div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">{user.full_name || user.username}</p>
                                <p className="text-[11px] text-slate-400">{user.email}</p>
                            </div>
                        </div>

                        {/* Direita: Badge + Tempo */}
                        <div className="text-right">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${colorClass}`}>
                                <Icon size={12} />
                                {label}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                                <Clock size={10} />
                                {status === 'online' ? 'Ativo agora' : `Visto: ${formatLastSeen(user.last_heartbeat)}`}
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