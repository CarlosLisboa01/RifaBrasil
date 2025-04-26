import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';

// Este é um endpoint de mock para simular o Mercado Pago em desenvolvimento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participation, unit_price } = body;
    
    // Obter os números escolhidos
    const chosenNumbers = participation?.chosen_numbers || [];
    
    // Adicionar os números escolhidos como parâmetro na URL
    const numbersParam = encodeURIComponent(JSON.stringify(chosenNumbers));
    
    // Criar identificador único para a transação
    const mockTransactionId = `MOCK-${uuidv4()}`;

    // Obter a URL base a partir da solicitação
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    console.log(`URL base detectada: ${baseUrl}`);
    
    // Primeiro, criar um registro na tabela participations_pending
    try {
      const { error: pendingError } = await supabase
        .from('participations_pending')
        .insert({
          user_id: participation.user_id,
          name: participation.name,
          phone: participation.phone,
          chosen_numbers: participation.chosen_numbers,
          raffle_id: participation.raffle_id,
          external_reference: mockTransactionId,
          payment_id: mockTransactionId,
          payment_status: 'pending',
          status: 'pending'
        });
        
      if (pendingError) {
        console.error('Erro ao criar participação pendente:', pendingError);
        return NextResponse.json({ 
          error: 'Erro ao criar participação pendente',
          details: pendingError
        }, { status: 500 });
      } else {
        console.log('Participação pendente criada com sucesso');
      }
    } catch (dbError) {
      console.error('Erro ao acessar banco de dados para criar pendência:', dbError);
      return NextResponse.json({ 
        error: 'Erro ao criar participação pendente',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
    
    // Registrar a participação no histórico independente do status
    try {
      // Verificar se a tabela existe antes de tentar inserir
      const { error: checkError } = await supabase
        .from('participation_history')
        .select('id')
        .limit(1);
        
      if (checkError) {
        console.error('Erro ao verificar tabela participation_history (pode não existir):', checkError);
        console.log('Pulando registro de histórico, continue com o fluxo...');
      } else {
        // Tabela existe, tentar inserir
        const { error: historyError } = await supabase
          .from('participation_history')
          .insert({
            user_id: participation.user_id,
            raffle_id: participation.raffle_id,
            chosen_numbers: participation.chosen_numbers,
            payment_status: 'pending', // Inicialmente pendente
            payment_id: mockTransactionId,
            amount: chosenNumbers.length * unit_price
          });
          
        if (historyError) {
          console.error('Erro ao registrar no histórico:', historyError);
        } else {
          console.log('Participação registrada no histórico com sucesso');
        }
      }
    } catch (dbError) {
      console.error('Erro ao acessar banco de dados para histórico:', dbError);
    }
    
    // Simular resposta do Mercado Pago
    return NextResponse.json({
      success: true,
      preferenceId: 'TEST-MOCK-PREFERENCE-ID',
      init_point: `${baseUrl}/pagamento/mock/checkout?numbers=${numbersParam}&transaction_id=${mockTransactionId}`,
      participation_id: mockTransactionId,
      transaction_id: mockTransactionId
    });
  } catch (error) {
    console.error('Mock API: Erro ao processar requisição:', error);
    return NextResponse.json({ 
      error: 'Erro no endpoint de mock',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 