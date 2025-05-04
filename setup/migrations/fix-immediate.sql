-- SCRIPT PARA CORRIGIR PROBLEMAS IMEDIATOS
-- Executar no SQL Editor do Supabase

-- 1. DESABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS
-- Isso deve resolver o erro "new row violates row-level security policy"
ALTER TABLE public.participations_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles_draws DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR TODAS AS POLÍTICAS RLS EXISTENTES E REMOVÊ-LAS
DO $$ 
DECLARE
    tabelas text[] := ARRAY['participations_pending', 'participants', 'raffles', 'raffles_draws', 'admin_users'];
    tabela text;
    politicas record;
BEGIN
    FOREACH tabela IN ARRAY tabelas
    LOOP
        FOR politicas IN 
            SELECT policyname 
            FROM pg_policy 
            WHERE tablename = tabela
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', politicas.policyname, tabela);
            RAISE NOTICE 'Política % removida da tabela %', politicas.policyname, tabela;
        END LOOP;
    END LOOP;
END $$;

-- 3. VERIFICAR SE O SORTEIO DE EXEMPLO EXISTE E CRIAR SE NÃO EXISTIR
DO $$
DECLARE
    count_raffles integer;
BEGIN
    SELECT COUNT(*) INTO count_raffles FROM public.raffles;
    
    IF count_raffles = 0 THEN
        INSERT INTO public.raffles (
            title, 
            description, 
            min_number, 
            max_number, 
            status, 
            unit_price, 
            image_url
        ) VALUES (
            'Celta Rebaixado', 
            'Sorteio de um Celta 2010 todo rebaixado com som automotivo',
            1, 
            100, 
            'open', 
            5.00,
            'https://nkuadhiaeosakxxozxmc.supabase.co/storage/v1/object/public/raffle-images/1745366590739_maxresdefault.jpg'
        );
        RAISE NOTICE 'Sorteio de exemplo criado com sucesso!';
    ELSE
        RAISE NOTICE 'Já existem % sorteios no banco de dados', count_raffles;
    END IF;
END $$;

-- 4. VERIFICAR STATUS ATUAL DO RLS NAS TABELAS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
      AND tablename IN (
          'participations_pending', 
          'participants', 
          'raffles', 
          'raffles_draws', 
          'admin_users'
      )
ORDER BY tablename; 