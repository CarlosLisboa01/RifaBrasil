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
    console.log('Webhook: Notificação recebida');
    
    // O Mercado Pago envia as notificações como application/x-www-form-urlencoded ou como JSON
    let type, dataId;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Parse JSON
      const jsonData = await request.json();
      console.log('Webhook: Dados JSON recebidos:', jsonData);
      
      type = jsonData.type;
      dataId = jsonData.data?.id;
    } else {
      // Parse form data
      const formData = await request.formData();
      console.log('Webhook: Dados de formulário recebidos');
      
      type = formData.get('type');
      dataId = formData.get('data[id]');
      
      // Registrar todos os campos recebidos para depuração
      const formDataObj: Record<string, any> = {};
      formData.forEach((value, key) => {
        formDataObj[key] = value;
      });
      console.log('Webhook: Campos de formulário completos:', formDataObj);
    }

    // Registrar a notificação recebida para depuração
    console.log('Webhook: Tipo de notificação:', type);
    console.log('Webhook: ID de dados:', dataId);

    // Verificar se é uma notificação de pagamento
    if (type !== 'payment') {
      return NextResponse.json({ message: 'Notificação recebida, mas não é de pagamento' });
    }

    if (!dataId) {
      console.error('Webhook: ID do pagamento não encontrado na notificação');
      return NextResponse.json({ error: 'ID do pagamento não fornecido' }, { status: 400 });
    }

    // Obter os detalhes do pagamento
    console.log('Webhook: Obtendo detalhes do pagamento:', dataId);
    const payment = await getPaymentStatus(dataId);
    console.log('Webhook: Status do pagamento:', payment.status);

    // Obter a referência externa para identificar a participação pendente
    const externalReference = payment.external_reference;
    console.log('Webhook: Referência externa:', externalReference);

    // Buscar a participação pendente no banco de dados
    console.log('Webhook: Buscando participação pendente com referência:', externalReference);
    const { data: pendingParticipation, error: fetchError } = await supabase
      .from('participations_pending')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (fetchError || !pendingParticipation) {
      console.error('Webhook: Erro ao buscar participação pendente:', fetchError);
      return NextResponse.json({ error: 'Participação pendente não encontrada' }, { status: 404 });
    }

    console.log('Webhook: Participação pendente encontrada, ID:', pendingParticipation.id);

    // Verificar se a participação já foi processada
    if (pendingParticipation.status === 'processed') {
      console.log('Webhook: Participação já processada anteriormente');
      return NextResponse.json({ message: 'Participação já processada anteriormente' });
    }

    // Registrar no histórico independente do status
    console.log('Webhook: Registrando no histórico de participações');
    const { error: historyError } = await supabase
      .from('participation_history')
      .insert({
        user_id: pendingParticipation.user_id,
        raffle_id: pendingParticipation.raffle_id,
        chosen_numbers: pendingParticipation.chosen_numbers,
        payment_status: payment.status, // Status atual do pagamento
        payment_id: dataId,
        amount: payment.transaction_amount || 0
      });

    if (historyError) {
      console.error('Webhook: Erro ao registrar no histórico:', historyError);
    } else {
      console.log('Webhook: Participação registrada no histórico com sucesso');
    }

    // Se o pagamento não foi aprovado, encerrar aqui
    if (payment.status !== 'approved') {
      // Atualizar o status da participação pendente
      await supabase
        .from('participations_pending')
        .update({ 
          status: payment.status === 'rejected' ? 'rejected' : 'pending', 
          payment_id: dataId 
        })
        .eq('id', pendingParticipation.id);
        
      console.log(`Webhook: Pagamento ${dataId} com status: ${payment.status}, atualizando registro`);
      return NextResponse.json({ message: `Pagamento com status ${payment.status}` });
    }

    // Registrar a participação efetiva na tabela de participants
    console.log('Webhook: Registrando participação efetiva');
    const { error: insertError } = await supabase
      .from('participants')
      .insert({
        user_id: pendingParticipation.user_id,
        name: pendingParticipation.name,
        phone: pendingParticipation.phone,
        chosen_numbers: pendingParticipation.chosen_numbers,
        raffle_id: pendingParticipation.raffle_id,
        payment_id: dataId,
        payment_status: 'approved',
        payment_amount: payment.transaction_amount
      });

    if (insertError) {
      console.error('Webhook: Erro ao registrar participação efetiva:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar participação' }, { status: 500 });
    }

    console.log('Webhook: Participação registrada com sucesso');

    // Atualizar o status da participação pendente para processada
    console.log('Webhook: Atualizando status da participação pendente');
    const { error: updateError } = await supabase
      .from('participations_pending')
      .update({ status: 'processed', payment_id: dataId })
      .eq('id', pendingParticipation.id);

    if (updateError) {
      console.error('Webhook: Erro ao atualizar status da participação pendente:', updateError);
    } else {
      console.log('Webhook: Status da participação atualizado com sucesso');
    }

    return NextResponse.json({ success: true, message: 'Pagamento processado com sucesso' });

  } catch (error) {
    console.error('Webhook: Erro ao processar webhook do Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
} 