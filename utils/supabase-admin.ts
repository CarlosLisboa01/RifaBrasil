import { createClient } from '@supabase/supabase-js';

// Obter as variáveis de ambiente ou usar valores padrão
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verificar se as credenciais estão definidas
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Credenciais de serviço do Supabase não definidas corretamente');
  console.warn(`URL: ${supabaseUrl ? '✅ Definida' : '❌ INDEFINIDA'}`);
  console.warn(`Service Key: ${supabaseServiceKey ? '✅ Definida' : '❌ INDEFINIDA'}`);
}

// Cliente do Supabase com permissões de administrador para contornar o RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para testar a conexão com o Supabase
export async function testSupabaseConnection() {
  try {
    // Tentar fazer uma busca simples
    const { count, error } = await supabaseAdmin
      .from('raffles')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error('❌ Erro ao testar conexão com o Supabase:', error);
      return { success: false, error };
    }
    
    console.log(`✅ Conexão com Supabase OK, tabela raffles contém ${count} registros`);
    return { success: true, count };
  } catch (error) {
    console.error('❌ Erro grave ao conectar com Supabase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Função para criar participação pendente contornando o RLS
export async function createPendingParticipation(data: {
  user_id: string;
  name: string;
  phone: string;
  chosen_numbers: number[];
  raffle_id: string;
  external_reference: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('participations_pending')
      .insert({
        user_id: data.user_id,
        name: data.name,
        phone: data.phone,
        chosen_numbers: data.chosen_numbers,
        raffle_id: data.raffle_id,
        external_reference: data.external_reference,
        status: 'pending'
      });
      
    if (error) {
      console.error('❌ Erro ao criar participação pendente:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro grave ao criar participação pendente:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
} 