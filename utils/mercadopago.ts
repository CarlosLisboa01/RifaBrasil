import mercadopago from 'mercadopago';

// Configurar o SDK do Mercado Pago com o Access Token
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-6177131190123047-042219-66d03f2a6b3ed15b50b2b1720d2b74fe-403922089'
});

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
        success: process.env.NEXT_PUBLIC_URL + '/pagamento/sucesso',
        failure: process.env.NEXT_PUBLIC_URL + '/pagamento/falha',
        pending: process.env.NEXT_PUBLIC_URL + '/pagamento/pendente'
      },
      notification_url: notificationUrl,
      auto_return: 'approved'
    };

    const response = await mercadopago.preferences.create(preference);
    return response.body;
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    throw error;
  }
}

// Função para verificar o status de um pagamento
export async function getPaymentStatus(paymentId: string) {
  try {
    const response = await mercadopago.payment.get(paymentId);
    return response.body;
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw error;
  }
}

export default mercadopago; 