-- ==========================================
-- HABILITA EXTENSÕES NECESSÁRIAS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- DROP DE TABELAS EXISTENTES
-- ==========================================
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.raffles CASCADE;
DROP TABLE IF EXISTS public.participations_pending CASCADE;
DROP TABLE IF EXISTS public.raffles_draws CASCADE;

-- ==========================================
-- CRIAÇÃO DE TABELAS PRINCIPAIS
-- ==========================================

-- Tabela de Sorteios
CREATE TABLE public.raffles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    min_number INTEGER NOT NULL DEFAULT 1,
    max_number INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
    winner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    drawn_at TIMESTAMP WITH TIME ZONE,
    unit_price NUMERIC DEFAULT 0,
    image_url TEXT
);

-- Tabela de Participantes
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL CHECK (name ~ '^[A-Za-zÀ-ÿ\s]+$'),
    phone TEXT NOT NULL CHECK (phone ~ '^\d{11}$'),
    chosen_numbers INTEGER[] NOT NULL,
    raffle_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    payment_id TEXT,
    payment_status TEXT DEFAULT 'approved',
    payment_amount NUMERIC(10,2)
);

-- Tabela de Administradores
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de Números Sorteados
CREATE TABLE public.raffles_draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raffle_id UUID NOT NULL,
    drawn_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de Participações Pendentes
CREATE TABLE public.participations_pending (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL CHECK (name ~ '^[A-Za-zÀ-ÿ\s]+$'),
    phone TEXT CHECK (phone ~ '^\d{11}$'),
    chosen_numbers INTEGER[] NOT NULL,
    raffle_id UUID NOT NULL,
    external_reference TEXT NOT NULL,
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índice para busca por referência externa
CREATE INDEX participations_pending_external_reference_idx 
ON public.participations_pending (external_reference);

-- ==========================================
-- RELAÇÕES (Foreign Keys)
-- ==========================================

ALTER TABLE public.raffles 
    ADD CONSTRAINT fk_winner_id 
    FOREIGN KEY (winner_id) 
    REFERENCES public.participants(id)
    ON DELETE SET NULL;

ALTER TABLE public.participants 
    ADD CONSTRAINT fk_raffle_id 
    FOREIGN KEY (raffle_id) 
    REFERENCES public.raffles(id)
    ON DELETE CASCADE;

ALTER TABLE public.participations_pending
    ADD CONSTRAINT fk_raffle_id
    FOREIGN KEY (raffle_id)
    REFERENCES public.raffles(id)
    ON DELETE CASCADE;

ALTER TABLE public.raffles_draws
    ADD CONSTRAINT fk_raffle_id
    FOREIGN KEY (raffle_id)
    REFERENCES public.raffles(id)
    ON DELETE CASCADE;

-- ==========================================
-- USUÁRIO ADMIN
-- ==========================================
INSERT INTO public.admin_users (user_id) 
VALUES ('a5675d30-e0a7-4fe5-b6db-5e2f7abf9476');

-- ==========================================
-- DESABILITA RLS EM TODAS AS TABELAS
-- ==========================================
ALTER TABLE public.raffles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles_draws DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- REMOVE TODAS AS POLÍTICAS RLS EXISTENTES
-- ==========================================
DO $$
DECLARE
    tabela text;
    politica record;
BEGIN
    FOR tabela IN SELECT unnest(ARRAY['participations_pending', 'participants', 'raffles', 'raffles_draws', 'admin_users'])
    LOOP
        FOR politica IN 
            SELECT pol.polname 
            FROM pg_policy pol
            JOIN pg_class cls ON pol.polrelid = cls.oid
            WHERE cls.relname = tabela
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', politica.polname, tabela);
            RAISE NOTICE 'Política % removida da tabela %', politica.polname, tabela;
        END LOOP;
    END LOOP;
END $$;

-- ==========================================
-- FUNÇÕES AUXILIARES PARA OPERAÇÕES SEGURAS
-- ==========================================

-- Função para inserir participações pendentes ignorando RLS
CREATE OR REPLACE FUNCTION public.insert_pending_participation(
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_chosen_numbers INTEGER[],
  p_raffle_id UUID,
  p_external_reference TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Isto é crucial: a função executará com as permissões do criador da função
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Inserir os dados na tabela participations_pending
  INSERT INTO public.participations_pending (
    user_id,
    name,
    phone,
    chosen_numbers,
    raffle_id,
    external_reference,
    status
  ) VALUES (
    p_user_id,
    p_name,
    p_phone,
    p_chosen_numbers,
    p_raffle_id,
    p_external_reference,
    'pending'
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Comentário: Esta função permite que a aplicação insira registros na tabela participations_pending
-- mesmo que o RLS esteja habilitado, pois a função é executada com as permissões do proprietário
-- do banco de dados, ignorando as políticas de segurança da linha.

-- Conceder permissão para que todos os usuários possam executar esta função
GRANT EXECUTE ON FUNCTION public.insert_pending_participation TO PUBLIC;

-- Função para verificar se um sorteio existe
CREATE OR REPLACE FUNCTION public.verify_raffle_exists(
  p_raffle_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  raffle_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.raffles WHERE id = p_raffle_id
  ) INTO raffle_exists;
  
  RETURN raffle_exists;
END;
$$;

-- Conceder permissão para que todos os usuários possam executar esta função
GRANT EXECUTE ON FUNCTION public.verify_raffle_exists TO PUBLIC;

-- ==========================================
-- INSERE SORTEIO DE EXEMPLO SE NÃO EXISTIR
-- ==========================================
DO $$
DECLARE
    count_raffles integer;
BEGIN
    SELECT COUNT(*) INTO count_raffles FROM public.raffles WHERE title = 'Celta Rebaixado';
    
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

-- ==========================================
-- VERIFICA STATUS ATUAL DO RLS
-- ==========================================
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