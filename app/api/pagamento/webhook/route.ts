import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/utils/mercadopago';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // O Mercado Pago envia as notificações como application/x-www-form-urlencoded
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const data = formData.get('data') as any;

    // Registrar a notificação recebida para depuração
    console.log('Notificação recebida:', { type, data });

    // Verificar se é uma notificação de pagamento
    if (type !== 'payment') {
      return NextResponse.json({ message: 'Notificação recebida, mas não é de pagamento' });
    }

    // Obter os detalhes do pagamento
    const paymentId = data.id;
    const payment = await getPaymentStatus(paymentId);

    // Verificar o status do pagamento
    if (payment.status !== 'approved') {
      console.log(`Pagamento ${paymentId} com status: ${payment.status}, não processando`);
      return NextResponse.json({ message: `Pagamento com status ${payment.status}` });
    }

    // Obter a referência externa para identificar a participação pendente
    const externalReference = payment.external_reference;

    // Buscar a participação pendente no banco de dados
    const { data: pendingParticipation, error: fetchError } = await supabase
      .from('participations_pending')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (fetchError || !pendingParticipation) {
      console.error('Erro ao buscar participação pendente:', fetchError);
      return NextResponse.json({ error: 'Participação pendente não encontrada' }, { status: 404 });
    }

    // Verificar se a participação já foi processada
    if (pendingParticipation.status === 'processed') {
      return NextResponse.json({ message: 'Participação já processada anteriormente' });
    }

    // Registrar a participação efetiva na tabela de participants
    const { error: insertError } = await supabase
      .from('participants')
      .insert({
        user_id: pendingParticipation.user_id,
        name: pendingParticipation.name,
        phone: pendingParticipation.phone,
        chosen_numbers: pendingParticipation.chosen_numbers,
        raffle_id: pendingParticipation.raffle_id,
        payment_id: paymentId,
        payment_status: 'approved',
        payment_amount: payment.transaction_amount
      });

    if (insertError) {
      console.error('Erro ao registrar participação efetiva:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar participação' }, { status: 500 });
    }

    // Atualizar o status da participação pendente para processada
    const { error: updateError } = await supabase
      .from('participations_pending')
      .update({ status: 'processed', payment_id: paymentId })
      .eq('id', pendingParticipation.id);

    if (updateError) {
      console.error('Erro ao atualizar status da participação pendente:', updateError);
    }

    return NextResponse.json({ success: true, message: 'Pagamento processado com sucesso' });

  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
} 