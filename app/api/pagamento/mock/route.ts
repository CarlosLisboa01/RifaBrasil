import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Este é um endpoint de mock para simular o Mercado Pago em desenvolvimento
export async function POST(request: NextRequest) {
  try {
    console.log("MOCK API: Recebendo requisição para simulação de pagamento");
    
    // Parse do corpo da requisição
    let body;
    try {
      body = await request.json();
      console.log("MOCK API: Corpo da requisição recebido:", JSON.stringify(body));
    } catch (parseError) {
      console.error("MOCK API: Erro ao analisar o corpo da requisição:", parseError);
      return NextResponse.json({ 
        error: 'Formato de requisição inválido', 
        details: 'Não foi possível analisar o corpo da requisição como JSON'
      }, { status: 400 });
    }
    
    // Extrair dados relevantes
    const { participation, unit_price } = body;
    
    // Validar dados necessários
    if (!participation || !participation.user_id || !participation.raffle_id || 
        !participation.chosen_numbers || !unit_price) {
      console.error("MOCK API: Dados incompletos:", body);
      return NextResponse.json({ 
        error: 'Dados incompletos', 
        details: 'Todos os campos da participação são necessários' 
      }, { status: 400 });
    }
    
    // Gerar referência externa e ID de preferência simulados
    const externalReference = uuidv4();
    const preferenceId = `MOCK_PREF_${Date.now()}`;
    
    // Extrair outros dados para logs
    const { user_id, name, chosen_numbers } = participation;
    const numberCount = chosen_numbers.length;
    const totalPrice = numberCount * unit_price;
    
    console.log("MOCK API: Dados processados:", {
      user_id,
      name,
      chosen_numbers: numberCount,
      total_price: totalPrice,
      external_reference: externalReference,
      preference_id: preferenceId
    });
    
    // URL base da aplicação
    const baseUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin;
    
    // URL para o checkout mockado
    const mockCheckoutUrl = `${baseUrl}/pagamento/mock/checkout?numbers=${encodeURIComponent(JSON.stringify(chosen_numbers))}&transaction_id=${externalReference}`;
    
    // Simular um pequeno delay para parecer mais realista
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      success: true,
      preferenceId: preferenceId,
      init_point: mockCheckoutUrl,
      participation_id: `MOCK_PART_${Date.now()}`,
      external_reference: externalReference,
      is_mock: true
    });
  } catch (error) {
    console.error('MOCK API: Erro ao processar simulação de pagamento:', error);
    return NextResponse.json({ 
      error: 'Erro na simulação de pagamento',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 