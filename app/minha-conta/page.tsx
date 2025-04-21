'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface UserParticipationStats {
  total_participations: number;
  total_raffles: number;
  total_numbers: number;
}

interface RaffleParticipation {
  id: string;
  raffle: {
    id: string;
    title: string;
    image_url: string;
    unit_price: number;
    status: string;
    description: string;
  };
  chosen_numbers: number[];
  created_at: string;
  total_paid: number;
}

export default function MinhaContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserParticipationStats>({
    total_participations: 0,
    total_raffles: 0,
    total_numbers: 0,
  });
  const [participations, setParticipations] = useState<RaffleParticipation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao verificar sessão:', sessionError.message);
          throw sessionError;
        }

        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Buscar participações com join completo
        const { data: participationsData, error: participationsError } = await supabase
          .from('participants')
          .select(`
            id,
            user_id,
            name,
            phone,
            chosen_numbers,
            created_at,
            raffle_id,
            raffle:raffles!raffle_id (
              id,
              title,
              description,
              image_url,
              unit_price,
              status,
              min_number,
              max_number
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (participationsError) {
          console.error('Erro ao buscar participações:', participationsError.message);
          throw participationsError;
        }

        if (!participationsData) {
          console.log('Nenhuma participação encontrada');
          setParticipations([]);
          setStats({
            total_participations: 0,
            total_raffles: 0,
            total_numbers: 0,
          });
          return;
        }

        console.log('Dados brutos das participações:', participationsData);

        const formattedParticipations = participationsData.map(p => ({
          id: p.id,
          name: p.name || session.user.user_metadata?.name || 'Não informado',
          phone: p.phone || session.user.user_metadata?.phone || 'Não informado',
          chosen_numbers: Array.isArray(p.chosen_numbers) ? p.chosen_numbers : [],
          created_at: p.created_at,
          raffle: p.raffle,
          total_paid: (Array.isArray(p.chosen_numbers) ? p.chosen_numbers.length : 0) * (p.raffle?.unit_price || 0)
        }));

        console.log('Participações formatadas:', formattedParticipations);

        setParticipations(formattedParticipations);

        // Calcular estatísticas
        const uniqueRaffles = new Set(participationsData.filter(p => p.raffle).map(p => p.raffle.id));
        const totalNumbers = participationsData.reduce((sum, p) => 
          sum + (Array.isArray(p.chosen_numbers) ? p.chosen_numbers.length : 0), 0);

        setStats({
          total_participations: participationsData.length,
          total_raffles: uniqueRaffles.size,
          total_numbers: totalNumbers,
        });

      } catch (error) {
        console.error('Erro ao carregar dados:', error instanceof Error ? error.message : 'Erro desconhecido');
        setParticipations([]);
        setStats({
          total_participations: 0,
          total_raffles: 0,
          total_numbers: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleCopyNumbers = async (participationId: string, numbers: number[]) => {
    try {
      const numbersText = numbers.sort((a, b) => a - b).join(', ');
      await navigator.clipboard.writeText(numbersText);
      setCopiedId(participationId);
      setTimeout(() => setCopiedId(null), 2000); // Remove o feedback após 2 segundos
    } catch (error) {
      console.error('Erro ao copiar números:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 mb-10 p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-title mb-4">Minha Conta</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-title mb-2">Dados Pessoais</h2>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="block text-sm font-medium text-title">Nome:</span>
                  <span className="text-important">{user?.user_metadata?.name || 'Não informado'}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-title">E-mail:</span>
                  <span className="text-important">{user?.email}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-title">Telefone:</span>
                  <span className="text-important">{user?.user_metadata?.phone || 'Não informado'}</span>
                </div>
                <div className="pt-2">
                  <Link
                    href="/minha-conta/editar"
                    className="inline-flex items-center text-sm text-green-600 hover:text-green-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar Dados
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-title mb-2">Estatísticas de Participação</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <span className="block text-sm font-medium text-title">Total de Participações</span>
                  <span className="text-2xl font-bold text-important">{stats.total_participations}</span>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <span className="block text-sm font-medium text-title">Sorteios Diferentes</span>
                  <span className="text-2xl font-bold text-important">{stats.total_raffles}</span>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <span className="block text-sm font-medium text-title">Números Escolhidos</span>
                  <span className="text-2xl font-bold text-important">{stats.total_numbers}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-title mb-4">Minhas Rifas</h2>
              <div className="space-y-4">
                {participations.map((participation) => {
                  // Por enquanto, vamos considerar apenas o status finished
                  const isWinner = participation.raffle?.status === 'finished';
                  
                  return (
                    <div 
                      key={participation.id} 
                      className={`rounded-lg overflow-hidden shadow-md transition-shadow
                        ${isWinner 
                          ? 'bg-green-50 border-2 border-green-500' 
                          : 'bg-white border'}`}
                    >
                      <div className="p-4">
                        {isWinner && (
                          <div className="mb-4 flex items-center justify-center bg-green-100 py-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                              <span className="text-lg font-bold text-green-800">VENCEDOR!</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start space-x-4">
                          {participation.raffle?.image_url && (
                            <div className="relative w-32 h-32 flex-shrink-0">
                              <Image
                                src={participation.raffle.image_url}
                                alt={participation.raffle.title}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="rounded-lg"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-medium ${isWinner ? 'text-green-800' : 'text-gray-900'}`}>
                              {participation.raffle?.title}
                            </h3>

                            <div className="mt-3">
                              <span className="text-sm font-medium text-gray-500">Data da Compra:</span>
                              <span className="ml-1 text-sm text-gray-900">
                                {new Date(participation.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Seus Números:</span>
                                <button
                                  onClick={() => handleCopyNumbers(participation.id, participation.chosen_numbers)}
                                  className="flex items-center text-sm text-green-600 hover:text-green-700 transition-colors"
                                >
                                  {copiedId === participation.id ? (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                      </svg>
                                      Copiar Números
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {participation.chosen_numbers.sort((a, b) => a - b).map((number) => (
                                  <span
                                    key={number}
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                                      ${isWinner
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {number}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-100">
                              <div>
                                <span className="text-sm font-medium text-gray-500">Quantidade:</span>
                                <span className="ml-1 text-sm font-bold text-gray-900">
                                  {participation.chosen_numbers.length} números
                                </span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Total Pago:</span>
                                <span className="ml-1 text-lg font-bold text-green-600">
                                  R$ {participation.total_paid.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex justify-between">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full 
                                  ${participation.raffle?.status === 'open' ? 'bg-green-100 text-green-800' : 
                                    participation.raffle?.status === 'closed' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'}`}
                                >
                                  Status: {participation.raffle?.status === 'open' ? 'Aberto' : 
                                          participation.raffle?.status === 'closed' ? 'Fechado' : 
                                          'Finalizado'}
                                </span>
                                {participation.raffle?.status === 'open' && (
                                  <Link
                                    href="/participar"
                                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                                  >
                                    Participar de outro sorteio
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {participations.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-2">Você ainda não participou de nenhum sorteio</p>
                    <Link
                      href="/participar"
                      className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Participar de Sorteios
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Link
              href="/participar"
              className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center transition-colors"
            >
              Participar de Sorteios
            </Link>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-6 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 text-center transition-colors"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 