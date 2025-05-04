-- Habilitar RLS na tabela participations_pending
ALTER TABLE public.participations_pending ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes, se houver
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.participations_pending;
DROP POLICY IF EXISTS "Permitir visualização para usuários autenticados" ON public.participations_pending;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.participations_pending;
DROP POLICY IF EXISTS "Permitir visualização para administradores" ON public.participations_pending;

-- Permitir que usuários autenticados visualizem suas próprias participações pendentes
CREATE POLICY "Permitir visualização para usuários autenticados"
ON public.participations_pending
FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que usuários autenticados insiram participações pendentes
CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.participations_pending
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários autenticados atualizem suas próprias participações pendentes
CREATE POLICY "Permitir atualização para usuários autenticados"
ON public.participations_pending
FOR UPDATE
USING (auth.uid() = user_id);

-- Permitir que service role acesse tudo (para webhook e operações de backend)
CREATE POLICY "Permitir acesso para service role"
ON public.participations_pending
USING (true)
WITH CHECK (true);

-- IMPORTANTE: Para o service role funcionar, precisamos dar acesso à chave de serviço
-- Você precisa usar uma chave de serviço (service key) no backend para operações que vêm do servidor

-- Aplicar as mesmas políticas para a tabela participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.participants;
DROP POLICY IF EXISTS "Permitir visualização para usuários autenticados" ON public.participants;
DROP POLICY IF EXISTS "Permitir visualização para administradores" ON public.participants;
DROP POLICY IF EXISTS "Permitir acesso para service role" ON public.participants;

-- Permitir que usuários autenticados visualizem suas próprias participações confirmadas
CREATE POLICY "Permitir visualização para usuários autenticados"
ON public.participants
FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que usuários autenticados insiram participações confirmadas
CREATE POLICY "Permitir inserção para usuários autenticados"
ON public.participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permitir que service role acesse tudo (para webhook e operações de backend)
CREATE POLICY "Permitir acesso para service role"
ON public.participants
USING (true)
WITH CHECK (true); 