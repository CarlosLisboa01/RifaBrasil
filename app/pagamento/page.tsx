'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mercadoPagoInfo } from '@/utils/mercadopago';

// Componente de loading para uso com Suspense
function LoadingFallback() {
  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Iniciando pagamento</h2>
        <p className="text-gray-600 mb-6">
          Estamos preparando seu pagamento. Por favor, aguarde um momento...
        </p>
      </div>
    </div>
  );
}

// Componente principal dentro de Suspense
function PagamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preferenceId = searchParams.get('preference_id');
    const participationId = searchParams.get('participation_id');
    
    if (!preferenceId || !participationId) {
      setError('Parâmetros de pagamento ausentes. Retorne à página de participação.');
      setLoading(false);
      return;
    }
    
    // Configuração do Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    
    script.onload = () => {
      try {
        // @ts-ignore - O MP está no objeto window após o carregamento do script
        const mp = new window.MercadoPago(mercadoPagoInfo.publicKey, {
          locale: 'pt-BR'
        });
        
        // Criar botão de pagamento
        mp.checkout({
          preference: {
            id: preferenceId
          },
          autoOpen: true, // Abrir automaticamente o checkout
        });
      } catch (err) {
        console.error('Erro ao inicializar Mercado Pago:', err);
        setError('Erro ao inicializar o checkout. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    script.onerror = () => {
      setError('Erro ao carregar o script do Mercado Pago. Verifique sua conexão.');
      setLoading(false);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [searchParams, router]);

  if (loading && !error) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Iniciando pagamento</h2>
          <p className="text-gray-600 mb-6">
            Estamos preparando seu pagamento. Por favor, aguarde um momento...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao iniciar pagamento</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/participar')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Voltar para Participação
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Este div é onde o botão do Mercado Pago será renderizado
  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Finalizar Pagamento</h2>
        <p className="text-gray-600 mb-6">
          Você será redirecionado para o Mercado Pago para finalizar sua compra.
        </p>
      </div>
      
      <div id="wallet_container" className="flex justify-center"></div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Se o checkout não abrir automaticamente, clique no botão acima.
        </p>
        <button
          onClick={() => router.push('/participar')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar e voltar
        </button>
      </div>
    </div>
  );
}

// Componente principal exportado com Suspense
export default function PagamentoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PagamentoContent />
    </Suspense>
  );
} 