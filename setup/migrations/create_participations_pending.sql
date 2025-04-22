-- Criação da tabela de participações pendentes
CREATE TABLE IF NOT EXISTS "participations_pending" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "chosen_numbers" integer[] NOT NULL,
  "raffle_id" uuid NOT NULL,
  "external_reference" text NOT NULL,
  "payment_id" text,
  "payment_status" text DEFAULT 'pending',
  "status" text DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id),
  CONSTRAINT fk_raffle FOREIGN KEY (raffle_id) REFERENCES raffles (id)
);

-- Adicionar índice para busca por external_reference
CREATE INDEX IF NOT EXISTS participations_pending_external_reference_idx 
ON participations_pending (external_reference);

-- Adicionar políticas de segurança (RLS)
ALTER TABLE "participations_pending" ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários vejam apenas suas próprias participações pendentes
CREATE POLICY "Users can view their own pending participations"
ON "participations_pending" FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que administradores vejam todas as participações pendentes
CREATE POLICY "Admins can view all pending participations"
ON "participations_pending" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- Permitir que o serviço possa inserir participações pendentes
CREATE POLICY "Service can insert pending participations"
ON "participations_pending" FOR INSERT
WITH CHECK (true);

-- Permitir que o serviço possa atualizar participações pendentes
CREATE POLICY "Service can update pending participations"
ON "participations_pending" FOR UPDATE
USING (true);

-- Adicionar campos na tabela participants para informações de pagamento
ALTER TABLE participants ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'approved';
ALTER TABLE participants ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2); 