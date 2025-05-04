import { NextResponse } from 'next/server';
import { mercadoPagoInfo } from '@/utils/mercadopago';

export async function GET() {
  try {
    // Verificar se o Mercado Pago está configurado
    return NextResponse.json({
      success: true,
      isConfigured: mercadoPagoInfo.isConfigured,
      publicKey: mercadoPagoInfo.publicKey,
    });
  } catch (error) {
    console.error('Erro ao testar configuração do Mercado Pago:', error);
    return NextResponse.json({ 
      error: 'Erro ao verificar configuração do Mercado Pago',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 