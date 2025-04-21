'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Participant, Raffle } from '@/types';

export default function ConfirmacaoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participation, setParticipation] = useState<Participant | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUserAndParticipation = async () => {
      try {
        setLoading(true);
        // Verificar se o usuário está logado
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user || null;
        setUser(currentUser);
        
        if (!currentUser) {
          setError('Usuário não autenticado. Faça login para ver suas participações.');
          setLoading(false);
          return;
        }
        
        try {
          // Primeiro buscar a participação
          const { data: participantData, error: participantError } = await supabase
            .from('participants')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (participantError) {
            // Se for erro de "não encontrado", damos uma mensagem amigável
            if (participantError.code === 'PGRST116') {
              setError('Você ainda não participou de nenhum sorteio. Participe agora!');
            } else {
              console.error('Erro ao buscar dados:', participantError);
              setError('Não foi possível carregar sua participação. Tente novamente mais tarde.');
            }
            return;
          }
          
          // Depois buscar o sorteio relacionado
          if (participantData) {
            const { data: raffleData, error: raffleError } = await supabase
              .from('raffles')
              .select('*')
              .eq('id', participantData.raffle_id)
              .single();
              
            if (raffleError) {
              console.error('Erro ao buscar sorteio:', raffleError);
              // Ainda podemos mostrar os dados do participante mesmo sem o sorteio
              setParticipation(participantData);
            } else {
              // Combinar os dados do participante com o sorteio
              const fullParticipation: Participant = {
                ...participantData,
                raffles: raffleData as Raffle
              };
              setParticipation(fullParticipation);
            }
          }
        } catch (participationError) {
          console.error('Erro inesperado:', participationError);
          setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
        }
      } catch (sessionError) {
        console.error('Erro na sessão:', sessionError);
        setError('Erro ao verificar sua sessão. Por favor, faça login novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserAndParticipation();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !participation) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border-t-4 border-green-600">
        <h1 className="text-2xl font-bold text-center text-green-600 mb-6">
          {!participation ? 'Sem participações encontradas' : 'Ops! Algo deu errado'}
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          {error || 'Não foi possível encontrar sua participação. Tente novamente.'}
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/participar"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Participar de um sorteio
          </Link>
          <Link
            href="/"
            className="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
          >
            Página inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 mb-10 p-6 bg-white rounded-lg shadow-md border-t-4 border-green-600">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-title">Participação Confirmada!</h1>
      </div>
      
      <div className="border-t border-b border-gray-200 py-4 mb-6">
        <h2 className="font-bold text-lg mb-4 text-title">Detalhes da sua participação:</h2>
        
        <div className="space-y-3">
          <div>
            <span className="text-title font-medium">Nome:</span>
            <p className="text-important">{participation.name}</p>
          </div>
          
          <div>
            <span className="text-title font-medium">Telefone:</span>
            <p className="text-important">{participation.phone}</p>
          </div>
          
          <div>
            <span className="text-title font-medium">Números escolhidos:</span>
            <p className="flex flex-wrap gap-2 mt-1">
              {participation.chosen_numbers.map((number) => (
                <span key={number} className="inline-block px-3 py-1 bg-green-100 text-black rounded-full text-sm">
                  {number}
                </span>
              ))}
            </p>
          </div>
          
          <div>
            <span className="text-title font-medium">Data de participação:</span>
            <p className="text-important">{new Date(participation.created_at).toLocaleString('pt-BR')}</p>
          </div>
          
          {participation.raffles && (
            <div>
              <span className="text-title font-medium">Sorteio:</span>
              <p className="text-important">{participation.raffles.title}</p>
              {participation.raffles.unit_price && (
                <p className="mt-1">
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-black rounded-full text-sm">
                    Valor: R$ {typeof participation.raffles.unit_price === 'number' 
                      ? participation.raffles.unit_price.toFixed(2).replace('.', ',') 
                      : participation.raffles.unit_price}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <p className="text-description text-center">
          Obrigado por participar! Você receberá uma notificação quando o sorteio for realizado.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/participar"
            className="inline-block text-center px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
          >
            Participar de outro sorteio
          </Link>
          
          <Link
            href="/resultados"
            className="inline-block text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Ver resultados
          </Link>
        </div>
      </div>
    </div>
  );
} 