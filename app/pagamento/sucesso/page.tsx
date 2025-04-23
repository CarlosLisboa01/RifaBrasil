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

export default function PagamentoSucessoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [participationDetails, setParticipationDetails] = useState<ParticipationDetails | null>(null);

  useEffect(() => {
    const fetchParticipationDetails = async () => {
      const payment_id = searchParams.get('payment_id');
      setPaymentId(payment_id);
      
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
            setParticipationDetails({
              id: data.id,
              raffle_title: data.raffles.title,
              chosen_numbers: data.chosen_numbers,
              total_paid: data.payment_amount
            });
          }
        } catch (error) {
          console.error('Erro ao buscar detalhes da participação:', error);
        }
      }
      
      setLoading(false);
      
      // Após 5 segundos, redirecionar para a página de conta
      const redirectTimer = setTimeout(() => {
        router.push('/minha-conta');
      }, 5000);

      return () => clearTimeout(redirectTimer);
    };
    
    fetchParticipationDetails();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-4">Pagamento Aprovado!</h2>
        
        {participationDetails ? (
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Sua participação no sorteio <span className="font-semibold">{participationDetails.raffle_title}</span> foi confirmada com sucesso.
            </p>
            
            <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Números escolhidos:</span>
                <span className="text-green-700 font-bold">
                  {participationDetails.chosen_numbers.sort((a, b) => a - b).join(', ')}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Valor pago:</span>
                <span className="text-green-700 font-bold">
                  R$ {participationDetails.total_paid.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 mb-6">
            Seu pagamento foi aprovado e sua participação foi confirmada com sucesso.
          </p>
        )}
        
        {paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            ID do Pagamento: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{paymentId}</span>
          </p>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          Você será redirecionado para sua conta em alguns segundos...
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <Link
            href="/minha-conta"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Ir para Minha Conta
          </Link>
          <Link
            href="/participar"
            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Participar de Outro Sorteio
          </Link>
        </div>
      </div>
    </div>
  );
} 