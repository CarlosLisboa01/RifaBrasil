'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle, Participant } from '@/types';

export default function FecharSorteioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

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
        
        // Verificar se o sorteio está no status 'open'
        if (raffleData.status !== 'open') {
          setError('Este sorteio não pode ser fechado. O status deve ser "Aberto".');
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
        
        setParticipants(participantsData || []);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao carregar o sorteio');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndLoadRaffle();
  }, [params.id, router]);

  const closeRaffle = async () => {
    try {
      setClosing(true);
      setError(null);
      setSuccess(null);
      
      if (!raffle) {
        throw new Error('Sorteio não encontrado');
      }
      
      // Atualizar o status do sorteio para 'closed'
      const { error: updateError } = await supabase
        .from('raffles')
        .update({
          status: 'closed'
        })
        .eq('id', raffle.id);
        
      if (updateError) throw updateError;
      
      setSuccess('Sorteio fechado com sucesso! Agora ele está pronto para o sorteio.');
      
      // Atualizar dados do sorteio na tela
      setRaffle({
        ...raffle,
        status: 'closed'
      });
      
      // Redirecionar para a página de detalhes após alguns segundos
      setTimeout(() => {
        router.push('/admin');
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao fechar sorteio:', error);
      setError(error.message || 'Erro ao fechar o sorteio');
    } finally {
      setClosing(false);
    }
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
        <h1 className="text-2xl font-bold text-blue-600 ml-2">Fechar Sorteio</h1>
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
          <p className="text-gray-600 mb-6">{raffle.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-semibold">
                {raffle.status === 'open' 
                  ? <span className="text-green-600">Aberto</span> 
                  : raffle.status === 'closed' 
                    ? <span className="text-yellow-600">Fechado</span> 
                    : <span className="text-blue-600">Finalizado</span>}
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
          
          {raffle.status === 'open' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Fechar este sorteio?</h3>
              <p className="text-yellow-700 mb-4">
                Ao fechar o sorteio, ele não aceitará mais participantes e estará pronto para a realização do sorteio.
                Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
              </p>
              
              <div className="flex items-center">
                <span className="text-sm text-yellow-600 mr-4">
                  Total de participantes: <strong>{participants.length}</strong>
                </span>
                
                <button
                  onClick={closeRaffle}
                  disabled={closing}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {closing ? 'Processando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </div>
          )}
          
          {raffle.status === 'closed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Sorteio Fechado</h3>
              <p className="text-blue-700 mb-4">
                Este sorteio já está fechado e pronto para ser realizado.
              </p>
              
              <Link
                href={`/admin/sorteios/${raffle.id}/sorteio`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Ir para Página de Sorteio
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">Lista de Participantes ({participants.length})</h2>
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
                  <tr key={participant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{participant.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {participant.chosen_numbers.map((number) => (
                          <span key={number} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
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
      </div>
    </div>
  );
} 