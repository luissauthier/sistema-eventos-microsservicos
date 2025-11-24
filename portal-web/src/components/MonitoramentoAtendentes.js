import React, { useState, useEffect } from 'react';
import { User, Wifi, WifiOff, Clock, PauseCircle } from 'lucide-react';
import api from '../api';
import '../App.css';

function MonitoramentoAtendentes() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      if (Array.isArray(res.data)) {
        setUsuarios(res.data);
      } else {
        console.warn("A API retornou algo que não é uma lista de usuários:", res.data);
        setUsuarios([]);
      }
    } catch (error) {
      console.error("Erro ao buscar status da equipe", error);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    const interval = setInterval(fetchUsuarios, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Nunca acessou";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    return isToday 
      ? `Hoje às ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const equipe = Array.isArray(usuarios) ? usuarios.filter(u => u.is_admin === true) : [];

  if (loading) return (
    <div className="monitoramento-loading">
      <div className="spinner-mini"></div> Carregando status da equipe...
    </div>
  );

  return (
    <div className="monitoramento-card">
      <div className="monitoramento-header">
        <h3>
            <User size={18} /> Central de Monitoramento
        </h3>
        <div className="live-badge">
            <span className="pulse-dot"></span> LIVE
        </div>
      </div>
      
      <div className="monitoramento-lista">
        {equipe.length === 0 ? (
            <p className="empty-state-mini">Nenhum administrador encontrado.</p>
        ) : (
            equipe.map(user => {
                // Lógica de Tempo
                const lastHeartbeat = user.last_heartbeat ? new Date(user.last_heartbeat).getTime() : 0;
                const now = new Date().getTime();
                const diffSeconds = (now - lastHeartbeat) / 1000;
                
                // Máquina de Estados de Conexão
                let statusConfig = {
                    state: 'offline',
                    label: 'Desconectado',
                    icon: WifiOff,
                    cssClass: 'status-offline'
                };

                // Se teve sinal nos últimos 90 segundos
                if (diffSeconds < 90) {
                    if (user.connection_status === 'working_offline') {
                         statusConfig = {
                             state: 'warning',
                             label: 'Modo Offline', // Clicou em "Trabalhar Offline"
                             icon: PauseCircle,
                             cssClass: 'status-warning'
                         };
                    } else {
                         statusConfig = {
                             state: 'online',
                             label: 'Online', // App Local com internet
                             icon: Wifi,
                             cssClass: 'status-online'
                         };
                    }
                } 
                // Caso especial: Estava trabalhando offline, mas sumiu há muito tempo (> 1 hora)
                else if (user.connection_status === 'working_offline' && diffSeconds < 3600) {
                    statusConfig = {
                        state: 'warning',
                        label: 'Sem Sincronia',
                        icon: PauseCircle,
                        cssClass: 'status-warning'
                    };
                }

                const Icon = statusConfig.icon;

                return (
                    <div key={user.id} className="atendente-row">
                        
                        {/* Avatar e Dados */}
                        <div className="atendente-info">
                            <div className={`avatar-wrapper ${statusConfig.state}`}>
                                <span className="avatar-initials">
                                    {user.full_name ? user.full_name.charAt(0) : user.username.charAt(0).toUpperCase()}
                                </span>
                                <div className="status-dot-absolute"></div>
                            </div>
                            <div>
                                <p className="atendente-nome">{user.full_name || user.username}</p>
                                <p className="atendente-meta">
                                    {user.email} • ID: {user.id}
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="atendente-status">
                            <div className={`badge-connection ${statusConfig.cssClass}`}>
                                <Icon size={12} strokeWidth={3} />
                                <span>{statusConfig.label}</span>
                            </div>
                            <p className="last-seen">
                                <Clock size={10} />
                                {statusConfig.state === 'online' 
                                    ? 'Ativo agora' 
                                    : `Visto: ${formatLastSeen(user.last_heartbeat)}`
                                }
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