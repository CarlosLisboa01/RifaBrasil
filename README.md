# Sorteio Novo

Uma plataforma completa para gerenciamento de sorteios online construída com Next.js e Supabase.

## Acesso ao Site

Para acessar o site da aplicação, visite: [https://rifabrasil.vercel.app](https://rifabrasil.vercel.app)

## Funcionalidades

- **Página Inicial**: Interface amigável com chamada para participação
- **Sistema de Autenticação**: Login e cadastro de usuários
- **Cadastro de Participantes**: Formulário com validações para participar dos sorteios
- **Sistema de Pagamento**: Integração com Mercado Pago para processamento de pagamentos
- **Painel de Administração**: Gerenciamento completo de sorteios e participantes
- **Área "Minha Conta"**: Gestão de perfil e visualização das participações do usuário
- **Resultados**: Visualização dos resultados de sorteios passados e futuros

## Tecnologias Utilizadas

- **Frontend**: Next.js (React), TailwindCSS
- **Backend**: Supabase (PostgreSQL, Autenticação, Armazenamento)
- **Validação de Formulários**: React Hook Form, Zod
- **Pagamentos**: API do Mercado Pago
- **Tipagem**: TypeScript

## Pré-requisitos

- Node.js 16+ instalado
- Conta no Supabase (gratuito para começar)

## Como Executar a Aplicação

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sorteinovo.git
cd sorteinovo
```

2. Instale as dependências:
```bash
npm install
# ou, se preferir usar yarn
yarn install
# ou, se preferir usar pnpm
pnpm install
```

### Configuração do Ambiente

1. Copie o arquivo `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```

2. Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### Executando o Servidor de Desenvolvimento

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

2. Acesse a aplicação:
Abra seu navegador e acesse `http://localhost:3000`

### Construindo para Produção

1. Crie uma build de produção:
```bash
npm run build
# ou
yarn build
# ou
pnpm build
```

2. Inicie o servidor de produção:
```bash
npm start
# ou
yarn start
# ou
pnpm start
```

## Configuração do Projeto

1. Configure o Supabase:
   - Crie uma conta em [supabase.com](https://supabase.com)
   - Crie um novo projeto
   - Copie a URL do projeto e a chave anônima (anon key)
   - Adicione esses valores ao seu arquivo `.env.local`

2. Configure o Mercado Pago (Novo!):
   - Crie uma conta no [Mercado Pago](https://www.mercadopago.com.br)
   - No painel do desenvolvedor, obtenha suas credenciais de teste:
     - `MERCADOPAGO_PUBLIC_KEY`
     - `MERCADOPAGO_ACCESS_TOKEN`
   - Adicione essas credenciais ao seu arquivo `.env.local`
   - Para produção, substitua pelas credenciais reais

3. Estrutura do banco de dados:
   - Use o SQL Editor no painel do Supabase para executar o script completo disponível em `setup/migrations/complete_setup.sql`
   - Este script cria as seguintes tabelas principais:
     - `raffles`: Informações sobre os sorteios
     - `participants`: Participações confirmadas
     - `participations_pending`: Participações aguardando pagamento
     - `admin_users`: Usuários com permissão de administrador
     - `raffles_draws`: Registros de números sorteados

```sql
-- Versão resumida do SQL (veja o arquivo completo em setup/migrations/complete_setup.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.raffles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    min_number INTEGER NOT NULL DEFAULT 1,
    max_number INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'open',
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
```

## Implantação

Para implantar o projeto em produção, recomendamos a Vercel:

1. Crie uma conta na [Vercel](https://vercel.com)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente (as mesmas do arquivo .env.local)
4. Implante o projeto

## Resolução de Problemas Comuns

- **Erro de conexão com o Supabase**: Verifique se suas credenciais no arquivo `.env.local` estão corretas
- **Erro ao criar tabelas**: Certifique-se de executar os comandos SQL na ordem correta, pois há dependências entre as tabelas
- **Problemas com RLS**: Verifique se as políticas de segurança estão corretamente configuradas para permitir o acesso necessário

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

# Guia de Hospedagem - GitHub e Vercel

Este guia explica como hospedar seu site usando GitHub e Vercel, uma plataforma gratuita para hospedagem de aplicações Next.js.

## Pré-requisitos

- Uma conta no [GitHub](https://github.com)
- Uma conta no [Vercel](https://vercel.com)
- [Git](https://git-scm.com/) instalado em seu computador
- Seu projeto Next.js funcionando localmente

## 1. Preparando o Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login
2. Clique no botão "+" no canto superior direito
3. Selecione "New repository"
4. Preencha o nome do repositório (ex: "rifa-brasil")
5. Escolha se será público ou privado
6. Clique em "Create repository"

## 2. Enviando seu Projeto para o GitHub

Abra o terminal na pasta do seu projeto e execute:

```bash
# Inicializar o Git (se ainda não existir)
git init

# Adicionar todos os arquivos
git add .

# Criar o primeiro commit
git commit -m "Primeiro commit"

# Adicionar o repositório remoto
git remote add origin https://github.com/seu-usuario/nome-do-repositorio.git

# Enviar o código para o GitHub
git push -u origin main
```

## 3. Hospedando no Vercel

1. Acesse [Vercel](https://vercel.com) e faça login com sua conta GitHub
2. Clique em "Add New Project"
3. Selecione o repositório que você acabou de criar
4. Configure as variáveis de ambiente (se necessário):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Outras variáveis específicas do seu projeto
5. Clique em "Deploy"

## 4. Configurações Adicionais

### Domínio Personalizado

1. No dashboard do Vercel, acesse seu projeto
2. Vá para "Settings" > "Domains"
3. Adicione seu domínio personalizado
4. Siga as instruções para configurar os registros DNS

### Atualizações Automáticas

O Vercel está configurado para fazer deploy automático sempre que você:
1. Fizer push para a branch principal (main/master)
2. Criar uma Pull Request (ambiente de preview)

## 5. Comandos Git Úteis

```bash
# Verificar status
git status

# Criar nova branch
git checkout -b nome-da-branch

# Mudar de branch
git checkout nome-da-branch

# Atualizar repositório local
git pull origin main

# Enviar alterações
git push origin nome-da-branch
```

## 6. Boas Práticas

1. Sempre faça commit de alterações relacionadas
2. Escreva mensagens de commit descritivas
3. Use branches para novas funcionalidades
4. Faça pull antes de começar novas alterações
5. Teste localmente antes de fazer deploy

## 7. Solução de Problemas

### Deploy Falhou?

1. Verifique os logs no Vercel
2. Confirme se todas as variáveis de ambiente estão configuradas
3. Teste o build localmente: `npm run build`
4. Verifique se todos os arquivos necessários estão no GitHub

### Problemas com Git?

1. Verifique se está na branch correta
2. Confirme se todas as alterações foram commitadas
3. Resolva conflitos se necessário

## Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação GitHub](https://docs.github.com)
- [Documentação Git](https://git-scm.com/doc)

## Contribuindo

Para contribuir com este projeto:

1. Faça um Fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra uma Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Fluxo de Pagamento

O sistema implementa um fluxo completo de pagamento:

1. Usuário seleciona números da rifa
2. Sistema cria um registro de participação pendente
3. Usuário é redirecionado para o Mercado Pago
4. Após o pagamento:
   - Sucesso: Registro confirmado na tabela `participants`
   - Pendente: Usuário pode verificar status na área "Minha Conta"
   - Falha: Usuário pode tentar novamente

As notificações de pagamento são processadas automaticamente por um webhook.

## Webhooks e Notificações

O sistema está preparado para receber notificações do Mercado Pago:

- Endpoint: `/api/pagamento/webhook`
- Função: Atualiza o status das participações conforme recebe notificações
- Segurança: Validação da origem das notificações