'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle, Participant } from '@/types';

export default function ExportarSorteioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hidePhoneNumbers, setHidePhoneNumbers] = useState(false);

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        setLoading(true);
        
        // Verificar se o usuário está logado e é administrador
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user || null;
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        // Verificar se o usuário é administrador
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
          
        if (adminError) {
          if (adminError.code === 'PGRST116') {
            // Usuário não é administrador
            router.push('/login');
            return;
          }
          throw adminError;
        }
        
        setIsAdmin(true);
        
        // Buscar o sorteio
        const { data: raffleData, error: raffleError } = await supabase
          .from('raffles')
          .select('*')
          .eq('id', params.id)
          .single();
          
        if (raffleError) throw raffleError;
        
        setRaffle(raffleData);
        
        // Buscar participantes do sorteio
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('raffle_id', params.id);
          
        if (participantsError) throw participantsError;
        
        setParticipants(participantsData || []);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao carregar os dados');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndLoadData();
  }, [params.id, router]);

  // Função para mascarar o número de telefone
  const maskPhoneNumber = (phone: string) => {
    if (hidePhoneNumbers) {
      // Mantém os 3 primeiros e os 2 últimos dígitos visíveis
      if (phone.length > 5) {
        const firstPart = phone.substring(0, 3);
        const lastPart = phone.substring(phone.length - 2);
        const maskedPart = '*'.repeat(phone.length - 5);
        return `${firstPart}${maskedPart}${lastPart}`;
      }
      // Para números muito curtos, substitui metade por asteriscos
      const visiblePart = Math.ceil(phone.length / 2);
      return phone.substring(0, visiblePart) + '*'.repeat(phone.length - visiblePart);
    }
    return phone;
  };

  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      if (!participants || participants.length === 0) {
        throw new Error('Não há participantes para exportar');
      }
      
      // Cabeçalhos CSV
      const headers = ['ID', 'Nome', 'Telefone', 'Números Escolhidos', 'Data de Registro'];
      
      // Converter dados para linhas CSV
      const csvRows = [
        headers.join(','), // Linha de cabeçalho
        ...participants.map(p => {
          const row = [
            p.id,
            `"${p.name.replace(/"/g, '""')}"`, // Escapar aspas duplas
            `"${maskPhoneNumber(p.phone).replace(/"/g, '""')}"`,
            `"${p.chosen_numbers.join(', ')}"`,
            new Date(p.created_at).toLocaleString('pt-BR')
          ];
          return row.join(',');
        })
      ];
      
      // Juntar linhas com quebras de linha
      const csvContent = csvRows.join('\n');
      
      // Criar blob e link para download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Configurar link e acionar download
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_sorteio_${raffle?.title || params.id}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
    } catch (err: any) {
      console.error('Erro ao exportar:', err);
      setError(err.message || 'Erro ao gerar arquivo CSV');
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    try {
      setIsExporting(true);
      
      if (!participants || participants.length === 0) {
        setError('Não há participantes para exportar');
        setIsExporting(false);
        return;
      }
      
      // Criar objeto de dados para exportação
      const exportData = {
        raffle: {
          id: raffle?.id,
          title: raffle?.title,
          description: raffle?.description,
          status: raffle?.status,
          min_number: raffle?.min_number,
          max_number: raffle?.max_number,
          created_at: raffle?.created_at,
          drawn_at: raffle?.drawn_at,
          winner_id: raffle?.winner_id
        },
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          phone: maskPhoneNumber(p.phone),
          chosen_numbers: p.chosen_numbers,
          created_at: p.created_at
        })),
        export_date: new Date().toISOString(),
        total_participants: participants.length,
        phone_numbers_masked: hidePhoneNumbers
      };
      
      // Converter para JSON
      const jsonContent = JSON.stringify(exportData, null, 2);
      
      // Criar blob e link para download
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Configurar link e acionar download
      link.setAttribute('href', url);
      link.setAttribute('download', `RifaBrasil_${raffle?.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
    } catch (err: any) {
      console.error('Erro ao exportar:', err);
      setError(err.message || 'Erro ao gerar arquivo JSON');
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Restrito</h1>
        <p className="text-lg mb-6">Apenas administradores podem acessar esta página.</p>
        <Link 
          href="/"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Voltar para Home
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
        <p className="text-lg mb-6">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Tentar Novamente
          </button>
          <Link 
            href={`/admin/sorteios/${params.id}`}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            Voltar para o Sorteio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-600">
            Exportar Dados do Sorteio
          </h1>
          <Link
            href={`/admin/sorteios/${params.id}`}
            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition flex items-center"
          >
            <span>Voltar</span>
          </Link>
        </div>
        
        {raffle && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h2 className="text-xl font-semibold text-green-800">{raffle.title}</h2>
            <p className="text-gray-700 mt-1">{raffle.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Números: {raffle.min_number} a {raffle.max_number}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Status: {raffle.status}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                Participantes: {participants.length}
              </span>
            </div>
          </div>
        )}
      </header>
      
      <main>
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Escolha o Formato de Exportação</h2>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="hide-phone-export"
              checked={hidePhoneNumbers}
              onChange={() => setHidePhoneNumbers(!hidePhoneNumbers)}
              className="mr-2 h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            <label htmlFor="hide-phone-export" className="text-gray-700">
              Ocultar números de telefone na exportação
            </label>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={exportToCSV}
              disabled={isExporting || participants.length === 0}
              className={`px-6 py-3 rounded-md transition-colors flex items-center gap-2 ${
                isExporting || participants.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exportando...</span>
                </>
              ) : (
                <span>Exportar como CSV</span>
              )}
            </button>
            
            <button
              onClick={exportToJSON}
              disabled={isExporting || participants.length === 0}
              className={`px-6 py-3 rounded-md transition-colors flex items-center gap-2 ${
                isExporting || participants.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exportando...</span>
                </>
              ) : (
                <span>Exportar como JSON</span>
              )}
            </button>
          </div>
          
          {participants.length === 0 && (
            <p className="mt-4 text-red-600">
              Não há participantes neste sorteio para exportar.
            </p>
          )}
        </section>
        
        {participants.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Prévia dos Dados</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Números
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Registro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.slice(0, 10).map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {participant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maskPhoneNumber(participant.phone)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {participant.chosen_numbers.slice(0, 10).map((num) => (
                            <span key={num} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {num}
                            </span>
                          ))}
                          {participant.chosen_numbers.length > 10 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              +{participant.chosen_numbers.length - 10} mais
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(participant.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {participants.length > 10 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                  Mostrando 10 de {participants.length} participantes. Exporte para ver todos.
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
} 