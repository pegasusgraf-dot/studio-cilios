# studio-cilios

Sistema de agendamento para studio de cílios, pronto para deploy no Vercel com API serverless e banco persistente no Supabase.

## Requisitos

- Vercel account
- Projeto Supabase com banco Postgres
- Variáveis de ambiente definidas no Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Estrutura

- `public/` — frontend estático
- `api/` — funções serverless (Express)

## Banco de dados sugerido

```sql
create table if not exists users (
  id text primary key,
  nome text not null,
  email text unique not null,
  senha text not null,
  tipo text not null default 'cliente',
  created_at timestamptz default now()
);

create table if not exists services (
  id text primary key,
  nome text not null,
  valor numeric(10,2) not null,
  duracao_minutos integer not null,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id text primary key,
  servico_id text not null,
  servico_nome text,
  valor numeric(10,2),
  usuario_id text not null,
  usuario_nome text,
  data_hora timestamptz not null,
  created_at timestamptz default now()
);
```

## Deploy no Vercel

1. Conecte este repositório ao Vercel.
2. Configure as variáveis de ambiente:
   - `SUPABASE_URL=https://SEU_PROJETO.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY`
3. Faça o deploy.
4. Acesse a aplicação e use os endpoints da API em `/api/*`.

## Observações

- O front-end não deve conter chaves secretas.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Para produção, prefira usar autenticação e regras de acesso do Supabase em vez de manter senhas em texto puro.

## Execução local

```bash
cd api
npm install
npm run dev
```

A API ficará disponível em `http://localhost:3001`.

Para testar o frontend localmente, use um servidor estático apontando para `public/` ou rode o projeto pelo Vercel CLI.

