-- Desabilitar temporariamente o RLS para permitir todas as operações
-- ISSO É APENAS PARA TESTE LOCAL! NÃO USE EM PRODUÇÃO SEM POLÍTICAS ADEQUADAS!

-- Desabilitar RLS na tabela participations_pending
ALTER TABLE public.participations_pending DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela participants
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;

-- Para verificar se as tabelas têm RLS desabilitado, execute:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Após testes, volte a habilitar o RLS e aplique as políticas adequadas usando o script fix_rls_policies.sql 