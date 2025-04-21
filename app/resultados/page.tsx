'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle } from '@/types';

type RaffleWithWinner = Raffle & {
  winner: {
    name: string;
    chosen_numbers: number[];
  } | null;
};

export default function ResultadosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedRaffles, setCompletedRaffles] = useState<RaffleWithWinner[]>([]);
  const [upcomingRaffles, setUpcomingRaffles] = useState<Raffle[]>([]);

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        setLoading(true);
        
        // Buscar sorteios completos com vencedores
        const { data: completedData, error: completedError } = await supabase
          .from('raffles')
          .select(`
            *,
            winner:participants!raffles_winner_id_fkey(name, chosen_numbers)
          `)
          .eq('status', 'completed')
          .order('drawn_at', { ascending: false });
          
        if (completedError) throw completedError;
        
        // Buscar sorteios abertos ou fechados (ainda não sorteados)
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('raffles')
          .select('*')
          .in('status', ['open', 'closed'])
          .order('created_at', { ascending: false });
          
        if (upcomingError) throw upcomingError;
        
        setCompletedRaffles(completedData || []);
        setUpcomingRaffles(upcomingData || []);
      } catch (error: any) {
        console.error('Erro ao buscar sorteios:', error);
        setError(error.message || 'Erro ao carregar os sorteios');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRaffles();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 mb-12 px-4">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-10">Resultados dos Sorteios</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Sorteios Realizados</h2>
        
        {completedRaffles.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">Ainda não há sorteios finalizados.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {completedRaffles.map((raffle) => (
              <div key={raffle.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 text-title">{raffle.title}</h3>
                  <p className="text-sm text-description mb-4">{raffle.description}</p>
                  
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <h4 className="font-medium text-sm text-title mb-2">Vencedor</h4>
                    
                    {raffle.winner ? (
                      <div>
                        <p className="font-bold text-important">{raffle.winner.name}</p>
                        <div className="mt-2">
                          <span className="text-xs text-title">Números escolhidos:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {raffle.winner.chosen_numbers.map((number) => (
                              <span key={number} className="inline-block px-2 py-1 bg-blue-100 text-black rounded-full text-xs">
                                {number}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-description italic">Informação não disponível</p>
                    )}
                  </div>
                  
                  <div className="text-right mt-4 text-sm text-description">
                    {raffle.drawn_at ? (
                      <span>Realizado em: {new Date(raffle.drawn_at).toLocaleDateString('pt-BR')}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Próximos Sorteios</h2>
        
        {upcomingRaffles.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">Não há sorteios programados no momento.</p>
            <Link
              href="/participar"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Ver sorteios disponíveis
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {upcomingRaffles.map((raffle) => (
              <div key={raffle.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{raffle.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      raffle.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {raffle.status === 'open' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{raffle.description}</p>
                  
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Números: {raffle.min_number} a {raffle.max_number}</span>
                    <span>Criado em: {new Date(raffle.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  {raffle.status === 'open' && (
                    <div className="mt-4">
                      <Link
                        href="/participar"
                        className="inline-block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Participar
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 