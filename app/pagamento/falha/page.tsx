'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Componente de loading para uso com Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
    </div>
  );
}

// Componente principal dentro de Suspense
function PagamentoFalhaContent() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const hasNumbers = chosenNumbers.length > 0;

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-red-600 mb-4">Pagamento não aprovado</h2>
        <p className="text-gray-600 mb-4">
          Infelizmente seu pagamento não foi aprovado. Você pode tentar novamente ou escolher outro método de pagamento.
        </p>
        
        {hasNumbers && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-600">Números escolhidos:</span>
              <div className="mt-1">
                <span className="text-red-700 font-bold text-lg">
                  {chosenNumbers.sort((a, b) => a - b).join(', ')}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Seus números foram registrados no histórico, mas estarão disponíveis somente após a confirmação do pagamento.
            </p>
          </div>
        )}
        
        {paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            ID do Pagamento: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{paymentId}</span>
          </p>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          Se você acredita que isso é um erro, entre em contato com nosso suporte.
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <Link
            href="/participar"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Tentar Novamente
          </Link>
          <Link
            href="/minha-conta"
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Ir para Minha Conta
          </Link>
        </div>
      </div>
    </div>
  );
}

// Componente principal exportado com Suspense
export default function PagamentoFalhaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PagamentoFalhaContent />
    </Suspense>
  );
} 