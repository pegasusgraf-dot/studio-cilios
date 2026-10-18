# Deploy & Vercel setup

Siga estes passos para que o projeto funcione na Vercel com o banco Supabase/Postgres.

1) Configure a variável de ambiente no Vercel
- Project → Settings → Environment Variables
- Name: DATABASE_URL
- Value (substitua PASSWORD):
  postgresql://postgres:PASSWORD@db.uxsulglvdmpeyrjdmajx.supabase.co:5432/postgres
- Add for Production (and Preview if desired).

2) Rode o SQL para criar as tabelas
- Use `schema.sql` (neste repositório) no SQL editor do Supabase ou via psql:
  PGPASSWORD="PASSWORD" psql "host=db.uxsulglvdmpeyrjdmajx.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" -f schema.sql

3) Teste localmente
- npm install
- export DATABASE_URL="postgresql://postgres:PASSWORD@db.uxsulglvdmpeyrjdmajx.supabase.co:5432/postgres"
- Use vercel dev or create a small wrapper server to run locally:
  node server.js  # where server.js proxies /api to the handler (example provided in earlier instructions)

4) Endpoints
- GET /api/health
- POST /api/login
- POST /api/cadastro
- GET /api/servicos
- POST /api/servicos
- DELETE /api/servicos/:id
- GET /api/agendamentos
- POST /api/agendamentos
- DELETE /api/agendamentos/:id

5) Troubleshooting
- If you get SSL errors, ensure the pool uses `ssl: { rejectUnauthorized: false }` in production (already configured in api/index.js).
- If functions fail on Vercel, check Deployment → Functions → logs for the function /api/index.js.

