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
    console.log("API: Recebendo requisição para criar preferência");
    
    const body = await request.json();
    
    // Novo formato: recebe diretamente os dados da participação
    const { participation, unit_price } = body;
    
    // Validar dados necessários
    if (!participation || !participation.user_id || !participation.raffle_id || 
        !participation.chosen_numbers || !unit_price) {
      return NextResponse.json({ 
        error: 'Dados incompletos', 
        details: 'Todos os campos da participação são necessários' 
      }, { status: 400 });
    }
    
    // Extrair os dados necessários
    const { user_id, name, phone, chosen_numbers, raffle_id } = participation;
    
    // Obter detalhes do sorteio
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('title')
      .eq('id', raffle_id)
      .single();
    
    if (raffleError) {
      console.error('API: Erro ao buscar informações do sorteio:', raffleError);
      return NextResponse.json({ 
        error: 'Sorteio não encontrado', 
        details: raffleError 
      }, { status: 404 });
    }
    
    // Calcular valor total
    const price = chosen_numbers.length * unit_price;
    
    console.log("API: Dados processados:", { 
      user_id, 
      name, 
      phone, 
      chosen_numbers: chosen_numbers.length, 
      raffle_id, 
      raffle_title: raffle.title, 
      price 
    });

    // Criar um ID de referência externa única para esta transação
    const externalReference = uuidv4();
    console.log("API: External reference gerada:", externalReference);
    
    try {
      // Verificar se a tabela participations_pending existe
      const { count, error: checkError } = await supabase
        .from('participations_pending')
        .select('*', { count: 'exact', head: true });
      
      if (checkError) {
        console.error('API: Erro ao verificar tabela participations_pending:', checkError);
        return NextResponse.json({ 
          error: 'Tabela participations_pending não encontrada ou não acessível', 
          details: checkError 
        }, { status: 500 });
      }
      
      console.log(`API: Tabela participations_pending existe e contém ${count} registros`);
    } catch (tableError) {
      console.error('API: Erro ao verificar tabela:', tableError);
    }
    
    // Salvar uma versão pendente da participação no banco de dados
    console.log("API: Tentando salvar participação pendente");
    const { data: participationData, error: participationError } = await supabase
      .from('participations_pending')
      .insert({
        user_id,
        name,
        phone,
        chosen_numbers,
        raffle_id,
        external_reference: externalReference,
        status: 'pending'
      })
      .select('*')
      .single();

    if (participationError) {
      console.error('API: Erro ao salvar participação pendente:', participationError);
      console.error('API: Detalhes do erro:', JSON.stringify(participationError));
      return NextResponse.json({ 
        error: 'Erro ao registrar participação pendente', 
        details: participationError 
      }, { status: 500 });
    }

    console.log("API: Participação pendente salva com sucesso. ID:", participationData.id);

    // URL de notificação para o webhook
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rifa-brasil.vercel.app';
    const notificationUrl = `${baseUrl}/api/pagamento/webhook`;
    console.log("API: URL de notificação:", notificationUrl);

    // Gerar a preferência de pagamento
    console.log("API: Gerando preferência de pagamento no Mercado Pago");
    const buyerEmail = 'comprador@example.com'; // Email padrão ou do usuário se disponível
    
    const preference = await createPaymentPreference(
      `${raffle.title} - ${chosen_numbers.length} número(s)`,
      price,
      1, // Quantidade sempre será 1, pois o preço já é o total
      buyerEmail,
      externalReference,
      notificationUrl
    );

    console.log("API: Preferência gerada com sucesso. ID:", preference.id);
    console.log("API: URL de pagamento:", preference.init_point);

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      init_point: preference.init_point, // URL para redirecionar o usuário
      participation_id: participationData.id
    });

  } catch (error) {
    console.error('API: Erro ao processar preferência de pagamento:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar preferência de pagamento',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 