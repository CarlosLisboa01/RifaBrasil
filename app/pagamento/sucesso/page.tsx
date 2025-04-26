'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

interface ParticipationDetails {
  id: string;
  raffle_title: string;
  chosen_numbers: number[];
  total_paid: number;
}

// Definir interface para a resposta do Supabase
interface RaffleData {
  id: string;
  title: string;
}

export default function PagamentoSucessoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [participationDetails, setParticipationDetails] = useState<ParticipationDetails | null>(null);
  const [numbersFromUrl, setNumbersFromUrl] = useState<number[]>([]);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const fetchParticipationDetails = async () => {
      const payment_id = searchParams.get('payment_id');
      setPaymentId(payment_id);
      
      // Tentar obter os números da URL (útil para ambientes de teste)
      const numbersParam = searchParams.get('numbers');
      if (numbersParam) {
        try {
          const parsedNumbers = JSON.parse(decodeURIComponent(numbersParam));
          if (Array.isArray(parsedNumbers)) {
            setNumbersFromUrl(parsedNumbers);
          }
        } catch (e) {
          console.error('Erro ao processar números da URL:', e);
        }
      }
      
      if (payment_id) {
        try {
          // Buscar detalhes da participação pelo ID do pagamento
          const { data, error } = await supabase
            .from('participants')
            .select(`
              id,
              chosen_numbers,
              payment_amount,
              raffles!inner (
                id,
                title
              )
            `)
            .eq('payment_id', payment_id)
            .single();
            
          if (data && !error) {
            // Determinar o título do sorteio com segurança para os tipos
            let raffleTitle = 'Sorteio';
            
            if (data.raffles) {
              if (Array.isArray(data.raffles)) {
                // Se for um array e tiver elementos, usa o título do primeiro
                if (data.raffles.length > 0 && data.raffles[0]?.title) {
                  raffleTitle = data.raffles[0].title;
                }
              } else if (typeof data.raffles === 'object' && data.raffles !== null) {
                // Se for um objeto, tenta acessar a propriedade title
                raffleTitle = data.raffles.title || 'Sorteio';
              }
            }
              
            setParticipationDetails({
              id: data.id,
              raffle_title: raffleTitle,
              chosen_numbers: data.chosen_numbers,
              total_paid: data.payment_amount
            });
          }
        } catch (error) {
          console.error('Erro ao buscar detalhes da participação:', error);
        }
      }
      
      setLoading(false);
      
      // Removi o redirecionamento automático para evitar conflitos com a navegação manual
    };
    
    fetchParticipationDetails();
  }, [router, searchParams]);

  const handleGoToAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    setRedirecting(true);
    router.push('/minha-conta');
  };

  const handleParticipateAgain = (e: React.MouseEvent) => {
    e.preventDefault();
    setRedirecting(true);
    router.push('/participar');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Determinar quais números mostrar (do banco ou da URL)
  const numbersToShow = participationDetails?.chosen_numbers || numbersFromUrl;
  const hasNumbers = numbersToShow.length > 0;

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-4">Pagamento Aprovado!</h2>
        
        <p className="text-gray-700 mb-4">
          {participationDetails ? (
            <>Sua participação no sorteio <span className="font-semibold">{participationDetails.raffle_title}</span> foi confirmada com sucesso.</>
          ) : (
            <>Seu pagamento foi aprovado e sua participação foi confirmada com sucesso.</>
          )}
        </p>
            
        {hasNumbers && (
          <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-600">Números escolhidos:</span>
              <div className="mt-1">
                <span className="text-green-700 font-bold text-lg">
                  {numbersToShow.sort((a, b) => a - b).join(', ')}
                </span>
              </div>
            </div>
            
            {participationDetails?.total_paid && (
              <div className="pt-2 border-t border-green-100">
                <span className="text-sm font-medium text-gray-600">Valor pago:</span>
                <div className="mt-1">
                  <span className="text-green-700 font-bold">
                    R$ {participationDetails.total_paid.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            ID do Pagamento: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{paymentId}</span>
          </p>
        )}
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <button
            onClick={handleGoToAccount}
            disabled={redirecting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {redirecting ? 'Redirecionando...' : 'Ir para Minha Conta'}
          </button>
          <button
            onClick={handleParticipateAgain}
            disabled={redirecting}
            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            Participar de Outro Sorteio
          </button>
        </div>
      </div>
    </div>
  );
} 