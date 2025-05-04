'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Componente de loading para uso com Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
    </div>
  );
}

// Componente principal dentro de Suspense
function PagamentoPendenteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [chosenNumbers, setChosenNumbers] = useState<number[]>([]);

  useEffect(() => {
    // Obter o ID de pagamento da URL
    const payment_id = searchParams.get('payment_id');
    setPaymentId(payment_id);
    
    // Tentar obter os números da URL (útil para ambientes de teste)
    const numbersParam = searchParams.get('numbers');
    if (numbersParam) {
      try {
        const parsedNumbers = JSON.parse(numbersParam);
        if (Array.isArray(parsedNumbers)) {
          setChosenNumbers(parsedNumbers);
        }
      } catch (e) {
        console.error('Erro ao processar números da URL:', e);
      }
    }
    
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const hasNumbers = chosenNumbers.length > 0;

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
          <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-yellow-600 mb-4">Pagamento pendente</h2>
        <p className="text-gray-600 mb-4">
          Seu pagamento está sendo processado. Isso pode levar alguns instantes.
        </p>
        
        {hasNumbers && (
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-600">Números escolhidos:</span>
              <div className="mt-1">
                <span className="text-yellow-700 font-bold text-lg">
                  {chosenNumbers.sort((a, b) => a - b).join(', ')}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Seus números foram reservados e serão confirmados após a aprovação do pagamento.
            </p>
          </div>
        )}
        
        {paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            ID do Pagamento: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{paymentId}</span>
          </p>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          Quando confirmado, você será notificado e sua participação será registrada automaticamente.
          Você pode verificar o status do seu pagamento na sua conta.
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <Link
            href="/minha-conta"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Ir para Minha Conta
          </Link>
          <Link
            href="/participar"
            className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Participar de Novo Sorteio
          </Link>
        </div>
      </div>
    </div>
  );
}

// Componente principal exportado com Suspense
export default function PagamentoPendentePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PagamentoPendenteContent />
    </Suspense>
  );
} 