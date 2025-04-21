'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle, Participant } from '@/types';

export default function SorteioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [performingSorteio, setPerformingSorteio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winner, setWinner] = useState<Participant | null>(null);
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
        
        // Verificar se o sorteio está no status 'closed'
        if (raffleData.status !== 'closed') {
          setError('Este sorteio não está pronto para ser realizado. O status deve ser "Fechado".');
          setRaffle(raffleData);
          return;
        }
        
        setRaffle(raffleData);
        
        // Buscar participantes do sorteio
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('raffle_id', params.id);
          
        if (participantsError) throw participantsError;
        
        if (!participantsData || participantsData.length === 0) {
          setError('Não há participantes neste sorteio.');
          return;
        }
        
        setParticipants(participantsData);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao carregar o sorteio');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndLoadRaffle();
  }, [params.id, router]);

  const performSorteio = async () => {
    try {
      setPerformingSorteio(true);
      setError(null);
      setSuccess(null);
      
      if (!raffle || !participants || participants.length === 0) {
        throw new Error('Não foi possível realizar o sorteio. Verifique se há participantes.');
      }
      
      // Escolher um vencedor aleatoriamente
      const randomIndex = Math.floor(Math.random() * participants.length);
      const selectedWinner = participants[randomIndex];
      
      // Escolher um número aleatório entre os números escolhidos pelo vencedor
      const winnerNumbers = selectedWinner.chosen_numbers;
      const randomNumberIndex = Math.floor(Math.random() * winnerNumbers.length);
      const drawnNumber = winnerNumbers[randomNumberIndex];
      
      setWinner(selectedWinner);
      
      // Atualizar o sorteio com o vencedor
      const { error: updateError } = await supabase
        .from('raffles')
        .update({
          status: 'completed',
          winner_id: selectedWinner.id,
          drawn_at: new Date().toISOString(),
        })
        .eq('id', raffle.id);
        
      if (updateError) throw updateError;
      
      // Inserir o número sorteado na tabela raffles_draws
      const { error: drawError } = await supabase
        .from('raffles_draws')
        .insert({
          raffle_id: raffle.id,
          drawn_number: drawnNumber,
          created_at: new Date().toISOString()
        });
        
      if (drawError) {
        console.error('Erro ao salvar número sorteado:', drawError);
        // Não vamos interromper o processo se esta etapa falhar
      }
      
      setSuccess(`Sorteio realizado com sucesso! Número sorteado: ${drawnNumber}`);
      
      // Atualizar dados do sorteio na tela
      setRaffle({
        ...raffle,
        status: 'completed',
        winner_id: selectedWinner.id,
        drawn_at: new Date().toISOString(),
      });
      
    } catch (error: any) {
      console.error('Erro ao realizar sorteio:', error);
      setError(error.message || 'Erro ao realizar o sorteio');
    } finally {
      setPerformingSorteio(false);
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
        <h1 className="text-2xl font-bold text-blue-600 ml-2">Realizar Sorteio</h1>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{raffle.title}</h2>
          <p className="text-gray-600 mb-4">{raffle.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-semibold">
                {raffle.status === 'open' ? 'Aberto' : 
                 raffle.status === 'closed' ? 'Fechado' : 'Finalizado'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Números</div>
              <div className="font-semibold">{raffle.min_number} a {raffle.max_number}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Participantes</div>
              <div className="font-semibold">{participants.length}</div>
            </div>
          </div>
          
          {raffle.status === 'closed' && !winner && (
            <div className="text-center mt-6">
              <button
                onClick={performSorteio}
                disabled={performingSorteio || participants.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {performingSorteio ? 'Realizando sorteio...' : 'Realizar Sorteio Agora'}
              </button>
              {participants.length === 0 && (
                <p className="mt-2 text-red-500 text-sm">Não há participantes para sortear</p>
              )}
            </div>
          )}
          
          {(winner || raffle.status === 'completed') && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-bold mb-4">Resultado do Sorteio</h3>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                
                <h4 className="text-xl font-bold text-center text-green-800 mb-2">Vencedor</h4>
                
                {winner ? (
                  <div className="text-center">
                    <p className="text-lg font-bold">{winner.name}</p>
                    <p className="text-gray-600">{maskPhoneNumber(winner.phone)}</p>
                    
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-1">Número sorteado:</p>
                      <div className="flex justify-center mb-4">
                        {winner.chosen_numbers.includes(Number(success?.match(/\d+$/)?.[0])) && (
                          <span className="inline-block px-4 py-2 bg-red-600 text-white font-bold rounded-full text-lg">
                            {success?.match(/\d+$/)?.[0]}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-1">Números escolhidos:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {winner.chosen_numbers.map((number) => (
                          <span 
                            key={number} 
                            className={`inline-block px-3 py-1 rounded-full text-sm ${
                              String(number) === success?.match(/\d+$/)?.[0] 
                                ? 'bg-red-600 text-white font-bold' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {number}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="mt-4 text-sm text-gray-500">
                      Sorteio realizado em: {new Date(raffle.drawn_at || new Date()).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gray-600">
                    Informações do vencedor não disponíveis.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Lista de Participantes ({participants.length})</h2>
          
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
        
        {participants.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhum participante registrado neste sorteio.</p>
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
                {participants.map((participant) => (
                  <tr key={participant.id} className={winner && winner.id === participant.id ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.name}
                        {winner && winner.id === participant.id && (
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
                              winner && winner.id === participant.id && String(number) === success?.match(/\d+$/)?.[0]
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
      </div>
      
      <div className="flex justify-between mt-8">
        <Link
          href="/admin"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Voltar para o Painel
        </Link>
        
        <Link
          href="/admin/resultados"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Ver Todos os Resultados
        </Link>
      </div>
    </div>
  );
} 