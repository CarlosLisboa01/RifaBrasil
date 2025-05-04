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
    console.log(`API: Buscando informações do sorteio com ID: ${raffle_id}`);
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', raffle_id)
      .single();
    
    if (raffleError) {
      console.error('API: Erro ao buscar informações do sorteio:', raffleError);
      return NextResponse.json({ 
        error: 'Sorteio não encontrado', 
        details: raffleError 
      }, { status: 404 });
    }
    
    if (!raffle) {
      console.error(`API: Sorteio com ID ${raffle_id} não encontrado`);
      return NextResponse.json({ 
        error: 'Sorteio não encontrado', 
        details: `Não existe sorteio com ID ${raffle_id}` 
      }, { status: 404 });
    }
    
    console.log(`API: Sorteio encontrado: ${raffle.title}`);
    
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
      
      // Tentar inserir diretamente via SQL para contornar o RLS
      const { data: sqlInsertData, error: sqlInsertError } = await supabase.rpc(
        'insert_pending_participation',
        { 
          p_user_id: user_id,
          p_name: name,
          p_phone: phone,
          p_chosen_numbers: chosen_numbers,
          p_raffle_id: raffle_id,
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

  } catch (error) {
    console.error('API: Erro ao processar preferência de pagamento:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar preferência de pagamento',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 