-- schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  tipo TEXT DEFAULT 'cliente'
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC(10,2) DEFAULT 0,
  duracao_minutos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  servico_id TEXT,
  servico_nome TEXT,
  valor NUMERIC(10,2) DEFAULT 0,
  usuario_id TEXT,
  usuario_nome TEXT,
  data_hora TIMESTAMP NOT NULL
);
