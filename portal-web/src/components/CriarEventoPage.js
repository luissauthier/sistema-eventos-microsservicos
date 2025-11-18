import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, FileText, Type, Save, Clock } from 'lucide-react'; // Adicionei Clock
import api from '../api';
import { buttonHoverTap } from '../App';

const CriarEventoPage = ({ setPagina, eventoEditando }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_evento: ''
  });

  // Preenche o formulário se estiver editando
  useEffect(() => {
    if (eventoEditando) {
      const dataFormatada = eventoEditando.data_evento
        ? new Date(eventoEditando.data_evento).toISOString().slice(0, 16)
        : '';

      setFormData({
        nome: eventoEditando.nome,
        descricao: eventoEditando.descricao || '',
        data_evento: dataFormatada
      });
    }
  }, [eventoEditando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.data_evento) {
      alert('Por favor, preencha o nome e a data do evento.');
      return;
    }

    try {
      setLoading(true);

      if (eventoEditando) {
        await api.patch(`/admin/eventos/${eventoEditando.id}`, {
          nome: formData.nome,
          descricao: formData.descricao,
          data_evento: formData.data_evento
        });
        alert('Evento atualizado com sucesso!');
      } else {
        await api.post('/admin/eventos', {
          nome: formData.nome,
          descricao: formData.descricao,
          data_evento: formData.data_evento
        });
        alert('Evento criado com sucesso!');
      }

      setPagina('eventos');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Ocorreu um erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      <motion.div 
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Botão Voltar */}
        <motion.button
          onClick={() => setPagina('eventos')}
          className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors text-sm font-medium"
          {...buttonHoverTap}
        >
          <ArrowLeft size={20} className="mr-2" /> 
          Voltar para a lista de eventos
        </motion.button>

        {/* Card Principal */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="bg-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {eventoEditando ? (
                <>Editando Evento <span className="text-indigo-200 text-sm font-normal ml-auto">#{eventoEditando.id}</span></>
              ) : (
                'Criar Novo Evento'
              )}
            </h2>
            <p className="text-indigo-100 mt-2 text-sm">
              {eventoEditando 
                ? 'Atualize as informações abaixo.' 
                : 'Preencha os campos para adicionar um novo evento ao calendário.'}
            </p>
          </div>

          {/* Formulário */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Input: Nome do Evento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Evento
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Type className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    placeholder="Ex: Workshop de React Avançado"
                    required
                  />
                </div>
              </div>

              {/* Input: Data e Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Hora
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="datetime-local"
                    name="data_evento"
                    value={formData.data_evento}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Input: Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição <span className="text-gray-400 text-xs ml-1">(Opcional)</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    name="descricao"
                    rows={4}
                    value={formData.descricao}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    placeholder="Detalhes sobre o local, palestrantes, tópicos abordados..."
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="pt-4">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all ${
                    loading 
                      ? 'bg-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center text-base">
                      <Save size={18} className="mr-2" />
                      {eventoEditando ? 'Salvar Alterações' : 'Criar Evento'}
                    </span>
                  )}
                </motion.button>
              </div>

            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CriarEventoPage;