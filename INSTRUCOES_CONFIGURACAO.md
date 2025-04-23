# Instruções para Corrigir os Problemas Atuais

## 1. Problema de RLS (Row Level Security)

O erro principal que você está enfrentando é o seguinte:
```
new row violates row-level security policy for table "participations_pending"
```

### Solução imediata (para desenvolvimento)

1. Acesse seu painel do Supabase
2. Vá para "SQL Editor"
3. Crie um novo script
4. Copie e cole o seguinte código SQL para **desabilitar temporariamente** o RLS:

```sql
-- ATENÇÃO: Use apenas em desenvolvimento!
ALTER TABLE public.participations_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
```

5. Execute o script

### Solução correta para produção

Para produção, você deve usar o script completo de SQL fornecido em `setup/migrations/complete_setup.sql`. Este script configura corretamente as tabelas e políticas RLS.

## 2. Problema com o MercadoPago SDK

Você está enfrentando um erro relacionado ao SDK do MercadoPago:
```
TypeError: mercadopago.configure is not a function
```

### Solução:

1. Execute o seguinte comando para instalar a versão correta do SDK:
```bash
npm uninstall mercadopago
npm install mercadopago@1.5.17
```

2. Verifique se o arquivo `utils/mercadopago.ts` foi atualizado com as alterações necessárias.

## 3. Variáveis de Ambiente

Verifique se seu arquivo `.env.local` contém as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://nkuadhiaeosakxxozxmc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdWFkaGlhZW9zYWt4eG96eG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTQwMzAsImV4cCI6MjA2MDQ3MDAzMH0.SsjaoXLXHV6nOLpCuindrlJ7d1LUbyAteQjSK4Lp9QU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdWFkaGlhZW9zYWt4eG96eG1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg5NDAzMCwiZXhwIjoyMDYwNDcwMDMwfQ.hpPxkXncAOhJxAPAeq_Kj6SRr0oxJU4kQH7PBRQdw6s

# URL base da aplicação
NEXT_PUBLIC_URL=http://localhost:3000

# Configuração do Mercado Pago
MERCADOPAGO_PUBLIC_KEY=TEST-ad3ac74c-5d82-43d7-948a-b1b4f73ed530
MERCADOPAGO_ACCESS_TOKEN=TEST-6177131190123047-042219-66d03f2a6b3ed15b50b2b1720d2b74fe-403922089
```

## 4. Reiniciar o Servidor

Depois de fazer todas essas alterações, reinicie completamente o servidor de desenvolvimento:

1. Pare qualquer processo Node.js em execução (Ctrl+C)
2. Execute `npm run dev` novamente

## 5. Verificação Final

Após fazer todas as alterações acima, verifique se:

1. A aplicação está rodando sem erros no console
2. Você consegue fazer login
3. Você consegue participar de um sorteio e escolher números
4. O redirecionamento para o Mercado Pago está funcionando

Se você continuar enfrentando problemas, revise os logs de erro para identificar a causa exata. 