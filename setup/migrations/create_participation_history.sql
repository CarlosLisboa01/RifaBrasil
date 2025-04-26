-- Criação da tabela de histórico de participações
CREATE TABLE IF NOT EXISTS "participation_history" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid,
  "raffle_id" uuid,
  "chosen_numbers" integer[] NOT NULL,
  "payment_status" text DEFAULT 'pending',
  "payment_id" text,
  "amount" numeric(10,2),
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT fk_raffle FOREIGN KEY (raffle_id) REFERENCES raffles (id) ON DELETE SET NULL
);

-- Adicionar índice para busca por payment_id
CREATE INDEX IF NOT EXISTS participation_history_payment_id_idx 
ON participation_history (payment_id);

-- Adicionar políticas de segurança (RLS)
ALTER TABLE "participation_history" ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários vejam apenas seu próprio histórico
CREATE POLICY "Users can view their own history"
ON "participation_history" FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Permitir que administradores vejam todo o histórico
CREATE POLICY "Admins can view all history"
ON "participation_history" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- Permitir que o serviço possa inserir no histórico
CREATE POLICY "Service can insert history"
ON "participation_history" FOR INSERT
WITH CHECK (true);

-- Comentário: Este histórico mantém um registro de todas as participações, 
-- independente do status do pagamento, permitindo rastrear a jornada completa do usuário. 