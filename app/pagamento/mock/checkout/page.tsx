'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';

// Componente de loading para uso com Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Componente principal dentro de Suspense
function MockCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [chosenNumbers, setChosenNumbers] = useState<number[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [transactionId, setTransactionId] = useState<string>('');
  const [pendingParticipation, setPendingParticipation] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Obter os números escolhidos e o ID da transação da URL
    const numbersParam = searchParams.get('numbers');
    if (numbersParam) {
      try {
        const parsedNumbers = JSON.parse(decodeURIComponent(numbersParam));
        if (Array.isArray(parsedNumbers)) {
          setChosenNumbers(parsedNumbers);
          // Valor por número escolhido é R$ 5,00
          setTotalValue(parsedNumbers.length * 5);
        } else {
          console.error('Formato inválido de números na URL');
          setErrorMessage('Erro: Formato inválido de números na URL');
        }
      } catch (error) {
        console.error('Erro ao processar números da URL:', error);
        setErrorMessage('Erro ao processar números da URL. Por favor, tente novamente.');
      }
    } else {
      setErrorMessage('Nenhum número foi selecionado para participação');
    }

    const txId = searchParams.get('transaction_id') || uuidv4();
    setTransactionId(txId);
    
    // Buscar informações sobre a participação pendente
    const fetchPendingParticipation = async () => {
      if (!txId) return;
      
      try {
        const { data, error } = await supabase
          .from('participations_pending')
          .select('*')
          .eq('external_reference', txId)
          .single();
          
        if (data && !error) {
          setPendingParticipation(data);
        } else if (error) {
          console.error('Erro ao buscar participação pendente:', error);
          // Não definir mensagem de erro aqui, pois pode não existir ainda
        }
      } catch (dbError) {
        console.error('Erro ao acessar banco de dados:', dbError);
      }
    };
    
    fetchPendingParticipation();
  }, [searchParams]);

  // Função para atualizar o status de pagamento no Supabase
  const updatePaymentStatus = async (status: 'approved' | 'rejected' | 'pending') => {
    if (!transactionId) return false;

    try {
      // Se temos informações da participação pendente
      if (pendingParticipation) {
        // Atualizar o registro na tabela participations_pending
        const { error } = await supabase
          .from('participations_pending')
          .update({ 
            payment_status: status,
            status: status 
          })
          .eq('external_reference', transactionId);

        if (error) {
          console.error('Erro ao atualizar status de participação pendente:', error);
          setErrorMessage(`Erro ao atualizar status: ${error.message}`);
          return false;
        }

        // Tentar registrar no histórico de participações
        try {
          const { error: historyError } = await supabase
            .from('participation_history')
            .insert({
              user_id: pendingParticipation.user_id,
              raffle_id: pendingParticipation.raffle_id,
              chosen_numbers: pendingParticipation.chosen_numbers,
              payment_status: status,
              payment_id: transactionId,
              amount: totalValue
            });

          if (historyError) {
            console.error('Erro ao registrar no histórico de participações:', historyError);
            // Não falhar por causa do histórico
          }
        } catch (historyError) {
          console.error('Erro grave ao acessar histórico:', historyError);
          // Não falhar se o histórico falhar
        }
        
        // Se o pagamento for aprovado, tentar registrar como participante
        if (status === 'approved') {
          try {
            const { error: participantError } = await supabase
              .from('participants')
              .insert({
                user_id: pendingParticipation.user_id,
                name: pendingParticipation.name,
                phone: pendingParticipation.phone || '00000000000', // Fallback se não tiver telefone
                chosen_numbers: pendingParticipation.chosen_numbers,
                raffle_id: pendingParticipation.raffle_id,
                payment_id: transactionId,
                payment_status: 'approved',
                payment_amount: totalValue
              });
              
            if (participantError) {
              console.error('Erro ao registrar participante:', participantError);
              // Não falhar se não conseguir adicionar como participante
            }
          } catch (participantError) {
            console.error('Erro grave ao registrar participante:', participantError);
          }
        }
        
        return true;
      } else {
        // Caso não encontre a participação pendente, tenta criar um registro no histórico
        // apenas com os dados que temos disponíveis
        console.warn('Participação pendente não encontrada, criando registro histórico com dados parciais');
        
        try {
          const { error: historyError } = await supabase
            .from('participation_history')
            .insert({
              payment_status: status,
              payment_id: transactionId,
              chosen_numbers: chosenNumbers,
              amount: totalValue
            });

          if (historyError) {
            console.error('Erro ao registrar no histórico com dados parciais:', historyError);
            setErrorMessage(`Erro ao registrar histórico: ${historyError.message}`);
            return false;
          }
        } catch (historyError) {
          console.error('Erro grave ao acessar histórico:', historyError);
          // Continue mesmo se falhar no histórico
        }
        
        return true;
      }
    } catch (error) {
      console.error('Erro ao processar atualização de pagamento:', error);
      setErrorMessage(`Erro ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  };

  const handlePayment = async (e: React.MouseEvent, status: 'approved' | 'rejected' | 'pending') => {
    e.preventDefault();
    
    if (loading || processingPayment) return;
    
    setLoading(true);
    setProcessingPayment(status);
    setErrorMessage(null);
    
    try {
      // Simular o processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Atualiza o status no banco
      const success = await updatePaymentStatus(status);
      
      if (!success) {
        throw new Error('Falha ao atualizar o status de pagamento');
      }
      
      // Redirecionamento de acordo com o status
      if (status === 'approved') {
        // Formato da URL para passar os números escolhidos como parâmetro
        const numbersParam = encodeURIComponent(JSON.stringify(chosenNumbers));
        router.push(`/pagamento/sucesso?payment_id=${transactionId}&numbers=${numbersParam}`);
      } else if (status === 'rejected') {
        router.push(`/pagamento/falha?reason=payment_rejected&payment_id=${transactionId}`);
      } else if (status === 'pending') {
        router.push(`/pagamento/pendente?payment_id=${transactionId}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setLoading(false);
      setProcessingPayment(null);
      setErrorMessage(`Erro: ${error instanceof Error ? error.message : 'Falha ao processar pagamento'}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Finalizar Compra</h1>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {errorMessage}
        </div>
      )}
      
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-semibold mb-3">Detalhes da Compra</h2>
        
        <div className="flex justify-between mb-2">
          <span>Números escolhidos:</span>
          <span className="font-medium">
            {chosenNumbers.length > 0 
              ? chosenNumbers.sort((a, b) => a - b).join(', ')
              : 'Nenhum número selecionado'}
          </span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span>Quantidade:</span>
          <span className="font-medium">{chosenNumbers.length} números</span>
        </div>
        
        <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2">
          <span>Total:</span>
          <span>R$ {totalValue.toFixed(2).replace('.', ',')}</span>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          ID da transação: {transactionId}
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Método de Pagamento</h2>
        <p className="text-sm text-gray-500 mb-4">
          Este é um ambiente de teste. Selecione abaixo o status de pagamento desejado.
        </p>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={(e) => handlePayment(e, 'approved')}
            disabled={loading}
            className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {processingPayment === 'approved' ? (
              <>
                <span className="animate-spin -ml-1 mr-2 h-4 w-4 border-t-2 border-b-2 border-white"></span>
                Processando...
              </>
            ) : (
              'Simular Pagamento Aprovado'
            )}
          </button>
          
          <button
            onClick={(e) => handlePayment(e, 'pending')}
            disabled={loading}
            className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {processingPayment === 'pending' ? (
              <>
                <span className="animate-spin -ml-1 mr-2 h-4 w-4 border-t-2 border-b-2 border-white"></span>
                Processando...
              </>
            ) : (
              'Simular Pagamento Pendente'
            )}
          </button>
          
          <button
            onClick={(e) => handlePayment(e, 'rejected')}
            disabled={loading}
            className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {processingPayment === 'rejected' ? (
              <>
                <span className="animate-spin -ml-1 mr-2 h-4 w-4 border-t-2 border-b-2 border-white"></span>
                Processando...
              </>
            ) : (
              'Simular Pagamento Rejeitado'
            )}
          </button>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4 mt-6">
        <Link
          href="/participar"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Voltar para seleção de números
        </Link>
      </div>
    </div>
  );
}

// Componente principal exportado com Suspense
export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MockCheckoutContent />
    </Suspense>
  );
} 