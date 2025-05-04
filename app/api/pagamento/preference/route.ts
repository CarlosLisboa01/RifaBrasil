import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPreference } from '@/utils/mercadopago';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Verificar se as variáveis de ambiente estão definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não definidas corretamente');
  console.error(`URL: ${supabaseUrl ? 'Definida' : 'INDEFINIDA'}`);
  console.error(`Anon Key: ${supabaseAnonKey ? 'Definida' : 'INDEFINIDA'}`);
  console.error(`Service Key: ${supabaseServiceKey ? 'Definida' : 'INDEFINIDA'}`);
}

// Inicializar cliente do Supabase
const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || supabaseAnonKey || ''
);

export async function POST(request: NextRequest) {
  try {
    console.log("API: Recebendo requisição para criar preferência");
    
    // Verificar conexão com Supabase
    try {
      const { count, error: checkError } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true });
        
      if (checkError) {
        console.error('API: Erro ao verificar conexão com Supabase:', checkError);
        return NextResponse.json({ 
          error: 'Erro de conexão com o banco de dados', 
          details: checkError
        }, { status: 500 });
      }
      
      console.log(`API: Conexão com Supabase OK, tabela raffles existe e contém ${count} registros`);
    } catch (connError) {
      console.error('API: Erro ao conectar com Supabase:', connError);
      return NextResponse.json({ 
        error: 'Falha na conexão com o banco de dados',
        details: connError instanceof Error ? connError.message : String(connError)
      }, { status: 500 });
    }
    
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
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', raffle_id)
      .single();
    
    if (raffleError) {
      console.error('API: Erro ao buscar informações do sorteio:', raffleError);
      // Tentar uma abordagem alternativa para buscar o sorteio
      const { data: allRaffles, error: allRafflesError } = await supabase
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
    
    // Processar a preferência de pagamento com o sorteio encontrado
    return processPaymentPreference(
      raffle,
      user_id,
      name, 
      phone,
      chosen_numbers,
      unit_price
    );
    
  } catch (error) {
    console.error('API: Erro ao processar preferência de pagamento:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar preferência de pagamento',
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
      raffle_id: raffle.id,
      external_reference: externalReference,
      status: 'pending'
    })
    .select('*')
    .single();

  if (participationError) {
    console.error('API: Erro ao salvar participação pendente:', participationError);
    console.error('API: Detalhes do erro:', JSON.stringify(participationError));
    
    // Tentar inserir diretamente via SQL para contornar o RLS
    const { data: sqlInsertData, error: sqlInsertError } = await supabase.rpc(
      'insert_pending_participation',
      { 
        p_user_id: user_id,
        p_name: name,
        p_phone: phone,
        p_chosen_numbers: chosen_numbers,
        p_raffle_id: raffle.id,
        p_external_reference: externalReference
      }
    );
    
    if (sqlInsertError) {
      console.error('API: Erro ao tentar inserção alternativa:', sqlInsertError);
      return NextResponse.json({ 
        error: 'Erro ao registrar participação pendente', 
        details: participationError 
      }, { status: 500 });
    }
    
    console.log('API: Inserção alternativa bem-sucedida:', sqlInsertData);
  }

  console.log("API: Participação pendente salva com sucesso. ID:", participationData?.id || 'Não disponível');

  // URL de notificação para o webhook
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rifa-brasil.vercel.app';
  const notificationUrl = `${baseUrl}/api/pagamento/webhook`;
  console.log("API: URL de notificação:", notificationUrl);

  // Gerar a preferência de pagamento
  console.log("API: Gerando preferência de pagamento no Mercado Pago");
  const buyerEmail = 'comprador@example.com'; // Email padrão ou do usuário se disponível
  
  try {
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
      participation_id: participationData?.id || 'pending-id'
    });
  } catch (mpError) {
    console.error('API: Erro ao criar preferência no Mercado Pago:', mpError);
    return NextResponse.json({ 
      error: 'Erro ao criar preferência no Mercado Pago', 
      details: mpError instanceof Error ? mpError.message : String(mpError)
    }, { status: 500 });
  }
} 