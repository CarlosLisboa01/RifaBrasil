-- Criar função para inserir participações pendentes ignorando as restrições de RLS
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

-- Criar uma função similar para verificar se um sorteio existe
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