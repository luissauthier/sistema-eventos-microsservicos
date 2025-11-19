import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

export function CheckinFlow() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('search'); // search, confirm, register
  const [nome, setNome] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);

  // ID do evento fixo para teste ou selecionado previamente
  // No roteiro real, isso viria de um select de eventos
  const EVENTO_ATUAL_ID = 1; 

  const handleSearch = async () => {
    // Aqui você buscaria primeiro localmente via IPC
    // Para simplificar o exemplo do roteiro "Participante 3 (Novo)":
    // Vamos assumir que não encontrou e ir para cadastro
    setStep('register'); 
  };

  const handleQuickCheckin = async () => {
    if (!nome || !email) return;

    try {
      // CHAMA O NOVO MÉTODO ATÔMICO
      const result = await window.api.realizarCheckinRapido({
        nome,
        email,
        eventoIdServer: EVENTO_ATUAL_ID
      });

      if (result.success) {
        setStep('success');
        setStatusMsg(`Check-in realizado! Participante ${nome} (OFFLINE)`);
      } else {
        setStatusMsg(`Erro: ${result.message}`);
      }
    } catch (err) {
      setStatusMsg("Erro crítico ao comunicar com banco local.");
    }
  };

  const reset = () => {
    setEmail('');
    setNome('');
    setStep('search');
    setStatusMsg(null);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Credenciamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* ETAPA 1: BUSCA */}
          {step === 'search' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail do Participante</label>
              <div className="flex gap-2">
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="participante@email.com" 
                />
                <Button onClick={handleSearch}>Buscar</Button>
              </div>
            </div>
          )}

          {/* ETAPA 2: CADASTRO RÁPIDO (OFFLINE) */}
          {step === 'register' && (
            <div className="space-y-4 animation-fade-in">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800 text-sm">
                  Usuário não encontrado. Iniciando <b>Inscrição Rápida</b>.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Nome do participante" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input value={email} disabled className="bg-slate-100" />
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="outline" onClick={reset} className="w-full">Cancelar</Button>
                <Button onClick={handleQuickCheckin} className="w-full bg-green-600 hover:bg-green-700">
                  Confirmar Presença
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 3: SUCESSO */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <div className="text-green-600 font-bold text-xl">
                ✓ Sucesso!
              </div>
              <p className="text-slate-600 text-sm">{statusMsg}</p>
              <Button onClick={reset}>Próximo Atendimento</Button>
            </div>
          )}

          {statusMsg && step !== 'success' && (
             <p className="text-red-500 text-sm mt-2">{statusMsg}</p>
          )}

        </CardContent>
      </Card>
    </div>
  );
}