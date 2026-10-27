const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const SESSION_SECRET = (process.env.SESSION_SECRET || 'studio-cilios-secret-dev').trim();

// Configuração da conexão com o Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_UE6cZYrpv5Gh@ep-wispy-waterfall-b8z771b8-pooler.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

const makeId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const normalizeUser = (user) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  tipo: user.tipo || 'cliente'
});

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ mensagem: 'Entre na sua conta para continuar.' });
  }
  next();
};

const requireMaster = (req, res, next) => {
  if (!req.session?.user || req.session.user.tipo !== 'master') {
    return res.status(403).json({ mensagem: 'Apenas o usuário master pode fazer isso.' });
  }
  next();
};

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  return cookieSession({
    name: 'studio_cilios_session',
    keys: [SESSION_SECRET],
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: SESSION_MAX_AGE
  })(req, res, next);
});

app.use(express.static(path.join(__dirname, 'public')));

// Health check com contagem real do banco
app.get('/api/health', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const servicesCount = await pool.query('SELECT COUNT(*) FROM services');
    res.json({
      ok: true,
      ambiente: 'neon-postgres',
      usuarios: Number(usersCount.rows[0].count),
      servicos: Number(servicesCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.get('/api/sessao', (req, res) => {
  res.json({ usuario: req.session?.user || null });
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ mensagem: 'Sessão encerrada.' });
});

// Cadastro de Usuário
app.post('/api/cadastro', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '').trim();

  if (!nome || !email || senha.length < 6) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail e senha com pelo menos 6 caracteres.' });
  }

  try {
    const jaExiste = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (jaExiste.rows.length > 0) {
      return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    }

    const id = makeId('user');
    const senhaHash = await bcrypt.hash(senha, 10);
    const tipo = 'cliente';

    await pool.query(
      'INSERT INTO users (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5)',
      [id, nome, email, senhaHash, tipo]
    );

    res.status(201).json({ id, mensagem: 'Cadastro realizado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '').trim();

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const passwordMatches = await bcrypt.compare(senha, user.senha);
    if (!passwordMatches) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    req.session = { user: normalizeUser(user) };
    res.json({ usuario: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

app.get('/api/usuarios/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();

  if (!id || id === 'studio-cliente') {
    return res.json({
      id: 'studio-cliente',
      nome: 'Studio de Cílios',
      cargo: 'Master',
      fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
    });
  }

  try {
    const result = await pool.query('SELECT id, nome, tipo FROM users WHERE id = $1', [id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    res.json({
      id: user.id,
      nome: user.nome,
      cargo: user.tipo === 'master' ? 'Master' : 'Cliente',
      fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// Serviços
app.get('/api/servicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, valor, duracao_minutos FROM services ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar serviços.' });
  }
});

app.post('/api/servicos', requireAuth, requireMaster, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const valor = Number(req.body.valor || 0);
  const duracao_minutos = Number(req.body.duracao_minutos || 0);

  if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(duracao_minutos) || duracao_minutos <= 0) {
    return res.status(400).json({ mensagem: 'Preencha nome, valor e duração válidos.' });
  }

  try {
    const id = makeId('serv');
    await pool.query(
      'INSERT INTO services (id, nome, valor, duracao_minutos) VALUES ($1, $2, $3, $4)',
      [id, nome, valor, duracao_minutos]
    );
    res.status(201).json({ id, nome, valor, duracao_minutos });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cadastrar serviço.' });
  }
});

app.put('/api/servicos/:id', requireAuth, requireMaster, async (req, res) => {
  const id = String(req.params.id || '').trim();
  const nome = String(req.body.nome || '').trim();
  const valor = Number(req.body.valor || 0);
  const duracao_minutos = Number(req.body.duracao_minutos || 0);

  if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(duracao_minutos) || duracao_minutos <= 0) {
    return res.status(400).json({ mensagem: 'Preencha nome, valor e duração válidos.' });
  }

  try {
    const result = await pool.query(
      'UPDATE services SET nome = $1, valor = $2, duracao_minutos = $3 WHERE id = $4 RETURNING *',
      [nome, valor, duracao_minutos, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao atualizar serviço.' });
  }
});

app.delete('/api/servicos/:id', requireAuth, requireMaster, async (req, res) => {
  const id = String(req.params.id || '').trim();

  try {
    await pool.query('DELETE FROM appointments WHERE servico_id = $1', [id]);
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    res.json({ mensagem: 'Serviço removido com sucesso.', item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao remover serviço.' });
  }
});

// Agendamentos
app.get('/api/agendamentos', requireAuth, async (req, res) => {
  const user = req.session.user;

  try {
    let query = 'SELECT * FROM appointments';
    let params = [];

    if (user.tipo !== 'master') {
      query += ' WHERE usuario_id = $1';
      params.push(user.id);
    }

    query += ' ORDER BY data_hora ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar agendamentos.' });
  }
});

app.post('/api/agendamentos', requireAuth, async (req, res) => {
  const servico_id = String(req.body.servico_id || '').trim();
  const data_hora = String(req.body.data_hora || '').trim();
  const usuario_id = String(req.body.usuario_id || req.session.user.id);

  if (!servico_id || !data_hora) {
    return res.status(400).json({ mensagem: 'Selecione um procedimento e informe a data/hora.' });
  }

  try {
    const servicoRes = await pool.query('SELECT * FROM services WHERE id = $1', [servico_id]);
    const service = servicoRes.rows[0];
    if (!service) {
      return res.status(404).json({ mensagem: 'Procedimento não encontrado.' });
    }

    const id = makeId('apt');
    const appointment = {
      id,
      servico_id: service.id,
      servico_nome: service.nome,
      valor: service.valor,
      usuario_id: usuario_id,
      usuario_nome: req.session.user.nome,
      data_hora
    };

    await pool.query(
      'INSERT INTO appointments (id, servico_id, servico_nome, valor, usuario_id, usuario_nome, data_hora) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [appointment.id, appointment.servico_id, appointment.servico_nome, appointment.valor, appointment.usuario_id, appointment.usuario_nome, appointment.data_hora]
    );

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao criar agendamento.' });
  }
});

app.delete('/api/agendamentos/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id || '');

  try {
    const aptRes = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    const appointment = aptRes.rows[0];

    if (!appointment) {
      return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    }

    const canDelete = req.session.user.tipo === 'master' || req.session.user.id === appointment.usuario_id;
    if (!canDelete) {
      return res.status(403).json({ mensagem: 'Você não pode remover este agendamento.' });
    }

    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ mensagem: 'Agendamento removido.' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao remover agendamento.' });
  }
});

app.get('/api/usuarios', requireAuth, requireMaster, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, tipo FROM users');
    res.json(
      result.rows.map((user) => ({
        ...user,
        pode_editar: user.tipo === 'master' ? 1 : 0
      }))
    );
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao listar usuários.' });
  }
});

// Inicialização e criação das tabelas corrigidas no Neon
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) DEFAULT 'cliente'
      );

      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        valor NUMERIC,
        duracao_minutos INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(64) PRIMARY KEY,
        servico_id VARCHAR(64),
        servico_nome VARCHAR(150),
        valor NUMERIC,
        usuario_id VARCHAR(64),
        usuario_nome VARCHAR(150),
        data_hora VARCHAR(50)
      );
    `);

    // Inserir usuário Master padrão se não existir
    const masterEmail = 'prodrigosilvacel@gmail.com.br';
    const checkMaster = await pool.query('SELECT id FROM users WHERE email = $1', [masterEmail]);
    
    if (checkMaster.rows.length === 0) {
      const passwordHash = await bcrypt.hash('w18187', 10);
      await pool.query(
        'INSERT INTO users (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5)',
        ['master-1', 'Studio Master', masterEmail, passwordHash, 'master']
      );
    }

    // Inserir serviços iniciais se a tabela estiver vazia
    const checkServices = await pool.query('SELECT COUNT(*) FROM services');
    if (Number(checkServices.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO services (id, nome, valor, duracao_minutos) VALUES 
        ('serv-1', 'Alongamento de cílios', 180, 90),
        ('serv-2', 'Volume russo', 240, 120),
        ('serv-3', 'Lash lifting', 220, 75);
      `);
    }

    console.log('Banco de dados Neon sincronizado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar tabelas no Neon:', err);
  }
};

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
  if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Studio de cílios rodando em http://localhost:${PORT}`);
    });
  }
});

module.exports = app;
