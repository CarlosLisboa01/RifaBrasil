# Resolvendo problemas de RLS (Row Level Security) no Supabase

## Problema

O erro `new row violates row-level security policy for table "participations_pending"` indica que você não tem permissão para inserir dados na tabela devido às políticas de segurança de linha (RLS) do Supabase.

## Solução 1: Usar a chave de serviço (recomendado para produção)

1. Obtenha sua chave de serviço no painel do Supabase:
   - Acesse seu projeto no Supabase
   - Vá para "Configurações" > "API"
   - Copie a "service_role key" (NÃO compartilhe esta chave, ela tem acesso total ao banco de dados)

2. Adicione a chave ao arquivo `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui
   ```

3. Verifique se o cliente Supabase nas rotas da API está configurado corretamente:
   ```typescript
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL || '',
     process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
   );
   ```

## Solução 2: Configurar políticas RLS adequadas (recomendado para produção)

Execute o script `fix_rls_policies.sql` no Editor SQL do Supabase:

1. Acesse seu projeto no Supabase
2. Vá para "SQL Editor"
3. Crie um novo script e cole o conteúdo do arquivo `setup/migrations/fix_rls_policies.sql`
4. Execute o script

Este script irá:
- Habilitar RLS nas tabelas
- Configurar políticas que permitem usuários autenticados acessarem apenas seus próprios dados
- Configurar políticas que permitem ao service role acessar todos os dados

## Solução 3: Desabilitar RLS temporariamente (apenas para desenvolvimento local)

⚠️ **ATENÇÃO**: Esta solução é apenas para ambiente de desenvolvimento local. NUNCA use isso em produção!

Execute o script `disable_rls_temporarily.sql` no Editor SQL do Supabase:

1. Acesse seu projeto no Supabase
2. Vá para "SQL Editor"
3. Crie um novo script e cole o conteúdo do arquivo `setup/migrations/disable_rls_temporarily.sql`
4. Execute o script

Este script irá desabilitar temporariamente as verificações de RLS, permitindo todas as operações.

## Verificando o status do RLS

Para verificar se uma tabela tem RLS habilitado ou desabilitado:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## Mais informações

Para mais informações sobre RLS no Supabase, consulte a [documentação oficial](https://supabase.io/docs/guides/auth/row-level-security). 