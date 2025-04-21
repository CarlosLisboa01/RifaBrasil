import { createClient } from '@supabase/supabase-js';

// Obter as variáveis de ambiente ou usar valores padrão
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis de ambiente do Supabase não definidas corretamente');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getServiceSupabase = () => {
  return createClient(
    supabaseUrl,
    supabaseAnonKey
  );
}; 