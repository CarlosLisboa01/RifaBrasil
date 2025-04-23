-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tabelas existentes para recriar tudo do zero
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.raffles CASCADE;
DROP TABLE IF EXISTS public.participations_pending CASCADE;
DROP TABLE IF EXISTS public.raffles_draws CASCADE;

-- Criar tabelas sem as referências circulares
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

CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
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

-- Tabela de números sorteados
CREATE TABLE public.raffles_draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raffle_id UUID NOT NULL,
    drawn_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de participações pendentes (aguardando pagamento)
CREATE TABLE public.participations_pending (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    chosen_numbers INTEGER[] NOT NULL,
    raffle_id UUID NOT NULL,
    external_reference TEXT NOT NULL,
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar índice para busca por external_reference
CREATE INDEX participations_pending_external_reference_idx 
ON public.participations_pending (external_reference);

-- Adicionar o seu usuário como administrador
INSERT INTO public.admin_users (user_id) 
VALUES ('a5675d30-e0a7-4fe5-b6db-5e2f7abf9476');

-- Depois adicionar as referências circulares
ALTER TABLE public.raffles 
    ADD CONSTRAINT fk_winner_id 
    FOREIGN KEY (winner_id) 
    REFERENCES public.participants(id);

ALTER TABLE public.participants 
    ADD CONSTRAINT fk_raffle_id 
    FOREIGN KEY (raffle_id) 
    REFERENCES public.raffles(id);

ALTER TABLE public.participations_pending
    ADD CONSTRAINT fk_raffle_id
    FOREIGN KEY (raffle_id)
    REFERENCES public.raffles(id);

ALTER TABLE public.raffles_draws
    ADD CONSTRAINT fk_raffle_id
    FOREIGN KEY (raffle_id)
    REFERENCES public.raffles(id);

-- Habilite RLS (Row Level Security)
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles_draws ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Desabilitar RLS para admin_users para resolver o problema de acesso
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Raffle Policies
DROP POLICY IF EXISTS "Sorteios visíveis para todos" ON public.raffles;
CREATE POLICY "Sorteios visíveis para todos" ON public.raffles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas admins podem inserir sorteios" ON public.raffles;
CREATE POLICY "Qualquer usuário autenticado pode inserir sorteios" ON public.raffles FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Apenas admins podem atualizar sorteios" ON public.raffles;
CREATE POLICY "Qualquer usuário autenticado pode atualizar sorteios" ON public.raffles FOR UPDATE USING (
    auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Apenas admins podem excluir sorteios" ON public.raffles;
CREATE POLICY "Qualquer usuário autenticado pode excluir sorteios" ON public.raffles FOR DELETE USING (
    auth.uid() IS NOT NULL
);

-- Participant Policies
DROP POLICY IF EXISTS "Usuários podem ver suas próprias participações" ON public.participants;
CREATE POLICY "Qualquer pessoa pode ver participações" ON public.participants FOR SELECT USING (
    true
);

DROP POLICY IF EXISTS "Usuários podem criar suas próprias participações" ON public.participants;
CREATE POLICY "Usuários podem criar suas próprias participações" ON public.participants FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias participações" ON public.participants;
CREATE POLICY "Usuários podem atualizar suas próprias participações" ON public.participants FOR UPDATE USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Apenas admins podem excluir participações" ON public.participants;
CREATE POLICY "Qualquer usuário autenticado pode excluir participações" ON public.participants FOR DELETE USING (
    auth.uid() IS NOT NULL
);

-- Participations Pending Policies
DROP POLICY IF EXISTS "Users can view their own pending participations" ON public.participations_pending;
CREATE POLICY "Users can view their own pending participations" ON public.participations_pending FOR SELECT USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can view all pending participations" ON public.participations_pending;
CREATE POLICY "Admins can view all pending participations" ON public.participations_pending FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Service can insert pending participations" ON public.participations_pending;
CREATE POLICY "Service can insert pending participations" ON public.participations_pending FOR INSERT WITH CHECK (
    true
);

DROP POLICY IF EXISTS "Service can update pending participations" ON public.participations_pending;
CREATE POLICY "Service can update pending participations" ON public.participations_pending FOR UPDATE USING (
    true
);

-- Raffle Draws Policies
DROP POLICY IF EXISTS "Anyone can view raffle draws" ON public.raffles_draws;
CREATE POLICY "Anyone can view raffle draws" ON public.raffles_draws FOR SELECT USING (
    true
);

DROP POLICY IF EXISTS "Only admins can insert raffle draws" ON public.raffles_draws;
CREATE POLICY "Only admins can insert raffle draws" ON public.raffles_draws FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Funções para verificar e adicionar colunas dinamicamente
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = check_column_exists.table_name
      AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

CREATE OR REPLACE FUNCTION add_column_to_table(table_name text, column_name text, column_type text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s', 
                 table_name, column_name, column_type);
END;
$$;

-- Verificar se o usuário admin foi inserido corretamente
SELECT * FROM public.admin_users WHERE user_id = 'a5675d30-e0a7-4fe5-b6db-5e2f7abf9476'; 