'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle, Participant } from '@/types';

type RaffleWithWinner = Raffle & {
  winner?: Participant | null;
  winning_number?: number;
};

export default function DetalheSorteioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raffle, setRaffle] = useState<RaffleWithWinner | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hidePhoneNumbers, setHidePhoneNumbers] = useState(false);

  useEffect(() => {
    const checkAdminAndLoadRaffle = async () => {
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
        
        // Se tiver vencedor, buscar detalhes do vencedor
        if (raffleData.winner_id) {
          const { data: winnerData, error: winnerError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', raffleData.winner_id)
            .single();
            
          if (!winnerError && winnerData) {
            // Buscar o número sorteado
            const { data: drawData, error: drawError } = await supabase
              .from('raffles_draws')
              .select('drawn_number')
              .eq('raffle_id', params.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
              
            const winningNumber = drawData?.drawn_number || null;
              
            setRaffle({
              ...raffleData,
              winner: winnerData,
              winning_number: winningNumber
            });
          }
        }
        
        // Buscar participantes do sorteio
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('raffle_id', params.id);
          
        if (participantsError) throw participantsError;
        
        setParticipants(participantsData || []);
        setFilteredParticipants(participantsData || []);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao carregar o sorteio');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndLoadRaffle();
  }, [params.id, router]);

  // Filtrar participantes quando o termo de busca mudar
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParticipants(participants);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = participants.filter(participant => {
      // Verificar se o nome contém o termo
      const nameMatch = participant.name.toLowerCase().includes(term);
      
      // Verificar se algum número escolhido corresponde ao termo (se o termo for numérico)
      const isNumeric = !isNaN(Number(term));
      const numberMatch = isNumeric && participant.chosen_numbers.some(num => 
        num.toString().includes(term)
      );
      
      // Verificar se o telefone contém o termo
      const phoneMatch = participant.phone.toLowerCase().includes(term);
      
      return nameMatch || numberMatch || phoneMatch;
    });
    
    setFilteredParticipants(filtered);
  }, [searchTerm, participants]);

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'closed':
        return 'Fechado';
      case 'completed':
        return 'Finalizado';
      default:
        return status;
    }
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6 text-center">
          Você não tem permissão para acessar esta área.
        </p>
        <div className="flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sorteio não encontrado</h1>
        <p className="text-gray-600 mb-6 text-center">
          O sorteio solicitado não foi encontrado.
        </p>
        <div className="flex justify-center">
          <Link
            href="/admin"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar para o painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 mb-12 px-4">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 mr-2">
          &larr; Voltar ao Painel
        </Link>
        <h1 className="text-2xl font-bold text-blue-600 ml-2">Detalhes do Sorteio</h1>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{raffle.title}</h2>
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeClass(raffle.status)}`}>
              {getStatusText(raffle.status)}
            </span>
          </div>
          
          <p className="text-gray-600 mb-6">{raffle.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Números</div>
              <div className="font-semibold">{raffle.min_number} a {raffle.max_number}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Participantes</div>
              <div className="font-semibold">{participants.length}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Data de Criação</div>
              <div className="font-semibold">{new Date(raffle.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
          
          {/* Ações baseadas no status */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Ações disponíveis</h3>
            
            <div className="space-x-3">
              {raffle.status === 'open' && (
                <Link
                  href={`/admin/sorteios/${raffle.id}/fechar`}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors inline-block"
                >
                  Fechar Sorteio
                </Link>
              )}
              
              {raffle.status === 'closed' && (
                <Link
                  href={`/admin/sorteios/${raffle.id}/sorteio`}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-block"
                >
                  Realizar Sorteio
                </Link>
              )}
              
              <Link
                href={`/admin/sorteios/${raffle.id}/exportar`}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors inline-block ml-2"
              >
                Exportar Dados
              </Link>
            </div>
          </div>
          
          {/* Exibir informações do vencedor se o sorteio estiver completo */}
          {raffle.status === 'completed' && raffle.winner && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Resultado do Sorteio</h3>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  
                  <h4 className="text-xl font-bold text-green-800 mb-2">Vencedor</h4>
                  <p className="text-lg font-bold">{raffle.winner.name}</p>
                  <p className="text-gray-600 mb-4">{maskPhoneNumber(raffle.winner.phone)}</p>
                  
                  <div>
                    {raffle.winning_number && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-1">Número sorteado:</p>
                        <span className="inline-block px-4 py-2 bg-red-600 text-white font-bold rounded-full text-lg">
                          {raffle.winning_number}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-500 mb-2">Números escolhidos:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {raffle.winner.chosen_numbers.map((number) => (
                        <span 
                          key={number} 
                          className={`inline-block px-3 py-1 rounded-full text-sm ${
                            raffle.winning_number === number 
                              ? 'bg-red-600 text-white font-bold' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {raffle.drawn_at && (
                    <p className="mt-4 text-sm text-gray-500">
                      Sorteio realizado em: {new Date(raffle.drawn_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center">
          <h2 className="text-xl font-semibold mb-2 sm:mb-0">Lista de Participantes ({participants.length})</h2>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center whitespace-nowrap">
              <input
                type="checkbox"
                id="hide-phone"
                checked={hidePhoneNumbers}
                onChange={() => setHidePhoneNumbers(!hidePhoneNumbers)}
                className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="hide-phone" className="text-sm text-gray-700">
                Ocultar telefones
              </label>
            </div>
          </div>
        </div>
        
        {participants.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhum participante registrado neste sorteio.</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhum participante encontrado para "{searchTerm}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Números Escolhidos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className={raffle.winner_id === participant.id ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.name}
                        {raffle.winner_id === participant.id && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Vencedor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{maskPhoneNumber(participant.phone)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {participant.chosen_numbers.map((number) => (
                          <span 
                            key={number} 
                            className={`px-2 py-1 text-xs rounded-full ${
                              raffle.winner_id === participant.id && raffle.winning_number === number
                                ? 'bg-red-600 text-white font-bold' 
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {number}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(participant.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredParticipants.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
            {searchTerm && filteredParticipants.length !== participants.length
              ? `Mostrando ${filteredParticipants.length} de ${participants.length} participantes.`
              : `Total: ${participants.length} participantes.`}
          </div>
        )}
      </div>
    </div>
  );
} 