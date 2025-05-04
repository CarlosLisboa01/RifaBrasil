import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPreference } from '@/utils/mercadopago';
import { supabaseAdmin, testSupabaseConnection, createPendingParticipation } from '@/utils/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log("API: Recebendo requisição para criar preferência");
    
    // Verificar conexão com Supabase usando a função de teste
    const connectionResult = await testSupabaseConnection();
    if (!connectionResult.success) {
      console.error('API: Erro na conexão com Supabase durante o teste:', connectionResult.error);
      return NextResponse.json({ 
        error: 'Erro de conexão com o banco de dados', 
        details: connectionResult.error
      }, { status: 500 });
    }
    
    console.log(`API: Conexão com Supabase OK, tabela raffles existe`);
    
    // Parse do corpo da requisição
    let body;
    try {
      body = await request.json();
      console.log("API: Corpo da requisição recebido:", JSON.stringify(body));
    } catch (parseError) {
      console.error("API: Erro ao analisar o corpo da requisição:", parseError);
      return NextResponse.json({ 
        error: 'Formato de requisição inválido', 
        details: 'Não foi possível analisar o corpo da requisição como JSON'
      }, { status: 400 });
    }
    
    // Novo formato: recebe diretamente os dados da participação
    const { participation, unit_price } = body;
    
    // Validar dados necessários
    if (!participation || !participation.user_id || !participation.raffle_id || 
        !participation.chosen_numbers || !unit_price) {
      console.error("API: Dados incompletos:", body);
      return NextResponse.json({ 
        error: 'Dados incompletos', 
        details: 'Todos os campos da participação são necessários' 
      }, { status: 400 });
    }
    
    // Extrair os dados necessários
    const { user_id, name, phone, chosen_numbers, raffle_id } = participation;
    
    // Obter detalhes do sorteio
    console.log(`API: Buscando informações do sorteio com ID: ${raffle_id}`);
    const { data: raffle, error: raffleError } = await supabaseAdmin
      .from('raffles')
      .select('*')
      .eq('id', raffle_id)
      .single();
    
    if (raffleError) {
      console.error('API: Erro ao buscar informações do sorteio:', raffleError);
      // Tentar uma abordagem alternativa para buscar o sorteio
      const { data: allRaffles, error: allRafflesError } = await supabaseAdmin
        .from('raffles')
        .select('*');
      
      if (allRafflesError) {
        console.error('API: Erro ao buscar todos os sorteios:', allRafflesError);
        return NextResponse.json({ 
          error: 'Erro ao acessar a tabela de sorteios', 
          details: allRafflesError 
        }, { status: 500 });
      }
      
      console.log(`API: Encontrados ${allRaffles?.length || 0} sorteios no total`);
      
      // Se não houver sorteios, retornar erro
      if (!allRaffles || allRaffles.length === 0) {
        return NextResponse.json({ 
          error: 'Nenhum sorteio encontrado no sistema', 
          details: 'A tabela de sorteios está vazia' 
        }, { status: 404 });
      }
      
      // Tentar encontrar o sorteio pelo ID (verificação manual)
      const foundRaffle = allRaffles.find(r => r.id === raffle_id || r.id.toString() === raffle_id.toString());
      
      if (!foundRaffle) {
        console.error(`API: Sorteio com ID ${raffle_id} não encontrado entre os ${allRaffles.length} sorteios disponíveis`);
        
        // Para fins de debug, listar todos os IDs disponíveis
        const availableIds = allRaffles.map(r => r.id);
        console.log("API: IDs de sorteios disponíveis:", availableIds);
        
        return NextResponse.json({ 
          error: 'Sorteio não encontrado', 
          details: `Não existe sorteio com ID ${raffle_id}. IDs disponíveis: ${availableIds.join(', ')}` 
        }, { status: 404 });
      }
      
      // Usar o sorteio encontrado manualmente
      console.log(`API: Sorteio encontrado manualmente: ${foundRaffle.title}`);
      
      // Continuar com o sorteio encontrado
      return processPaymentPreference(
        foundRaffle,
        user_id,
        name,
        phone,
        chosen_numbers,
        unit_price
      );
    }
    
    if (!raffle) {
      console.error(`API: Sorteio com ID ${raffle_id} não encontrado`);
      return NextResponse.json({ 
        error: 'Sorteio não encontrado', 
        details: `Não existe sorteio com ID ${raffle_id}` 
      }, { status: 404 });
    }
    
    console.log(`API: Sorteio encontrado: ${raffle.title}`);
    
    // Processar a preferência de pagamento
    return processPaymentPreference(
      raffle,
      user_id,
      name,
      phone,
      chosen_numbers,
      unit_price
    );
    
  } catch (error) {
    console.error("API: Erro inesperado ao criar preferência:", error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Função auxiliar para processar a preferência de pagamento
async function processPaymentPreference(
  raffle: any,
  user_id: string,
  name: string,
  phone: string,
  chosen_numbers: number[],
  unit_price: number
) {
  // Calcular valor total
  const price = chosen_numbers.length * unit_price;
  
  console.log("API: Dados processados:", { 
    user_id, 
    name, 
    phone, 
    chosen_numbers: chosen_numbers.length, 
    raffle_id: raffle.id, 
    raffle_title: raffle.title, 
    price 
  });

  // Criar um ID de referência externa única para esta transação
  const externalReference = uuidv4();
  console.log("API: External reference gerada:", externalReference);
  
  // Criar participação pendente
  console.log("API: Criando participação pendente");
  try {
    // Salvar a participação pendente no banco
    await createPendingParticipation({
      user_id,
      name,
      phone,
      chosen_numbers,
      raffle_id: raffle.id,
      external_reference: externalReference
    });
    
    console.log("API: Participação pendente criada com sucesso");
  } catch (participationError) {
    console.error('API: Erro ao salvar participação pendente:', participationError);
    return NextResponse.json({ 
      error: 'Erro ao registrar participação pendente', 
      details: participationError instanceof Error ? participationError.message : String(participationError)
    }, { status: 500 });
  }

  // URL de notificação para o webhook
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rifa-brasil.vercel.app';
  const notificationUrl = `${baseUrl}/api/pagamento/webhook`;
  console.log("API: URL de notificação:", notificationUrl);

  // Gerar a preferência de pagamento
  console.log("API: Gerando preferência de pagamento no Mercado Pago");
  const buyerEmail = 'comprador@example.com'; // Email padrão ou do usuário se disponível
  
  try {
    const preferenceResult = await createPaymentPreference({
      items: [
        {
          title: `${chosen_numbers.length} número(s) para ${raffle.title}`,
          quantity: 1,
          unit_price: price,
          currency_id: 'BRL',
          description: `Participação no sorteio: ${raffle.title}`,
        }
      ],
      payer: {
        name,
        email: buyerEmail,
        phone: {
          number: phone
        }
      },
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: {
        success: `${baseUrl}/minha-conta?status=success`,
        failure: `${baseUrl}/minha-conta?status=failure`,
        pending: `${baseUrl}/minha-conta?status=pending`
      },
      auto_return: "approved"
    });

    console.log("API: Preferência de pagamento criada com sucesso:", preferenceResult.id);
    
    // Retornar o ID da preferência e a URL de inicialização
    return NextResponse.json({
      success: true,
      preference_id: preferenceResult.id,
      init_point: preferenceResult.init_point,
      external_reference: externalReference
    });
  } catch (mpError) {
    console.error("API: Erro ao criar preferência de pagamento:", mpError);
    return NextResponse.json({ 
      error: 'Erro ao criar preferência de pagamento', 
      details: mpError instanceof Error ? mpError.message : String(mpError)
    }, { status: 500 });
  }
} 