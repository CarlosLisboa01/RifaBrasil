// Importar MercadoPago SDK v2
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Definir o Access Token e Public Key
const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-6177131190123047-042219-66d03f2a6b3ed15b50b2b1720d2b74fe-403922089';
const PUBLIC_KEY = process.env.MERCADOPAGO_PUBLIC_KEY || 'TEST-ad3ac74c-5d82-43d7-948a-b1b4f73ed530';

// Configurar o SDK do Mercado Pago com o Access Token
console.log("Configurando MercadoPago com token:", ACCESS_TOKEN.substring(0, 10) + '...');

// Inicializar o cliente do MercadoPago com o token de acesso
const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
console.log("MercadoPago configurado com sucesso");

// Função para criar uma preferência de pagamento
export async function createPaymentPreference(
  title: string,
  price: number,
  quantity: number,
  buyerEmail: string,
  externalReference: string,
  notificationUrl: string
) {
  try {
    console.log("MP: Criando preferência para:", { title, price, quantity, externalReference });
    
    // Verificar se a URL base está configurada
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rifa-brasil.vercel.app';
    console.log("MP: URL base:", baseUrl);

    const preference = {
      items: [
        {
          title: title,
          unit_price: price,
          quantity: quantity,
          currency_id: 'BRL',
        }
      ],
      payer: {
        email: buyerEmail
      },
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso`,
        failure: `${baseUrl}/pagamento/falha`,
        pending: `${baseUrl}/pagamento/pendente`
      },
      redirect_urls: {
        success: `${baseUrl}/pagamento/sucesso`,
        failure: `${baseUrl}/pagamento/falha`
      },
      notification_url: notificationUrl,
      auto_return: 'approved'
    };

    console.log("MP: Enviando configuração para MercadoPago:", JSON.stringify(preference));
    
    const preferenceClient = new Preference(client);
    const response = await preferenceClient.create({ body: preference });
    
    console.log("MP: Resposta recebida. ID:", response.id);
    
    return response;
  } catch (error) {
    console.error('MP: Erro ao criar preferência de pagamento:', error);
    throw error;
  }
}

// Função para verificar o status de um pagamento
export async function getPaymentStatus(paymentId: string) {
  try {
    console.log("MP: Verificando status do pagamento:", paymentId);
    
    const paymentClient = new Payment(client);
    const response = await paymentClient.get({ id: paymentId });
    
    console.log("MP: Status recebido:", response.status);
    return response;
  } catch (error) {
    console.error('MP: Erro ao verificar status do pagamento:', error);
    throw error;
  }
}

// Exportar informações necessárias
export const mercadoPagoInfo = {
  publicKey: PUBLIC_KEY,
  isConfigured: !!ACCESS_TOKEN
};

// Exportar a instância do cliente para usar em outros arquivos
export { client as mercadopago }; 