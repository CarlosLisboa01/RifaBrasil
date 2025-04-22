import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPreference } from '@/utils/mercadopago';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Inicializar cliente do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, phone, chosenNumbers, raffleId, raffleTitle, price } = body;

    if (!userId || !raffleId || !chosenNumbers || !price || chosenNumbers.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Criar um ID de referência externa única para esta transação
    const externalReference = uuidv4();
    
    // Salvar uma versão pendente da participação no banco de dados
    const { data: participation, error: participationError } = await supabase
      .from('participations_pending')
      .insert({
        user_id: userId,
        name: name,
        phone: phone,
        chosen_numbers: chosenNumbers,
        raffle_id: raffleId,
        external_reference: externalReference,
        status: 'pending'
      })
      .select('*')
      .single();

    if (participationError) {
      console.error('Erro ao salvar participação pendente:', participationError);
      return NextResponse.json({ error: 'Erro ao registrar participação pendente' }, { status: 500 });
    }

    // URL de notificação para o webhook
    const notificationUrl = `${process.env.NEXT_PUBLIC_URL || 'https://rifa-brasil.vercel.app'}/api/pagamento/webhook`;

    // Gerar a preferência de pagamento
    const preference = await createPaymentPreference(
      `${raffleTitle} - ${chosenNumbers.length} número(s)`,
      price,
      1, // Quantidade sempre será 1, pois o preço já é o total
      participation.email || 'comprador@email.com', // Email do comprador
      externalReference,
      notificationUrl
    );

    return NextResponse.json({
      success: true,
      preference_id: preference.id,
      init_point: preference.init_point, // URL para redirecionar o usuário
      participation_id: participation.id
    });

  } catch (error) {
    console.error('Erro ao processar preferência de pagamento:', error);
    return NextResponse.json({ error: 'Erro ao processar preferência de pagamento' }, { status: 500 });
  }
} 