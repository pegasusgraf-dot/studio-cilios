const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')
  ? { rejectUnauthorized: false }
  : false,
});

const DEFAULT_MASTER_EMAIL = 'prodrigosilvacel@gmail.com.br';
const DEFAULT_MASTER_PASSWORD = 'w18187';

const sendJson = (res, status, payload = {}) => {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (status === 204) return res.end();

  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  if (req.body && Object.keys(req.body).length) return req.body;

  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');

    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  return {};
};

const makeId = () => `id_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

const normalizeUser = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo || 'cliente',
});

const normalizeService = (s) => ({
  id: s.id,
  nome: s.nome,
  valor: Number(s.valor || 0),
  duracao_minutos: Number(s.duracao_minutos || 0),
});

const normalizeAppointment = (a) => ({
  id: a.id,
  servico_id: a.servico_id,
  servico_nome: a.servico_nome || 'Procedimento',
  valor: Number(a.valor || 0),
  data_hora: a.data_hora,
  usuario_id: a.usuario_id || null,
  usuario_nome: a.usuario_nome || null,
});

const testDatabase = async () => {
  try {
    const result = await pool.query('SELECT 1 as ok, NOW() as now');
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao testar conexão com o banco:', error.message);
    return null;
  }
};

const getMasterUser = () => ({
  id: 'master_paulo',
  nome: 'Paulo',
  email: DEFAULT_MASTER_EMAIL,
  senha: DEFAULT_MASTER_PASSWORD,
  tipo: 'master',
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 204, {});
    }

    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (!process.env.DATABASE_URL) {
      return sendJson(res, 500, {
        mensagem: 'DATABASE_URL não configurada no ambiente da Vercel.',
      });
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      const dbStatus = await testDatabase();
      if (!dbStatus) {
        return sendJson(res, 500, {
          ok: false,
          message: 'Banco indisponível',
        });
      }

      return sendJson(res, 200, {
        ok: true,
        message: 'Postgres reachable',
        now: dbStatus.now,
      });
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await parseBody(req);
      const { email, senha } = body || {};

      if (!email || !senha) {
        return sendJson(res, 400, { mensagem: 'E-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const passwordMatch = String(senha) === String(DEFAULT_MASTER_PASSWORD);

      if (normalizedEmail === DEFAULT_MASTER_EMAIL && passwordMatch) {
        return sendJson(res, 200, { usuario: normalizeUser(getMasterUser()) });
      }

      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
      const user = rows[0];
      if (!user || String(user.senha) !== String(senha)) {
        return sendJson(res, 401, { mensagem: 'E-mail ou senha incorretos.' });
      }

      return sendJson(res, 200, { usuario: normalizeUser(user) });
    }

    if (req.method === 'POST' && pathname === '/api/cadastro') {
      const body = await parseBody(req);
      const { nome, email, senha } = body || {};

      if (!nome || !email || !senha) {
        return sendJson(res, 400, { mensagem: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (existing[0]) {
        return sendJson(res, 400, { mensagem: 'Este e-mail já está cadastrado.' });
      }

      const id = makeId();
      const insert = await pool.query(
        'INSERT INTO users (id,nome,email,senha,tipo) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [id, String(nome).trim(), normalizedEmail, String(senha), 'cliente']
      );

      return sendJson(res, 201, {
        mensagem: 'Cadastrado com sucesso!',
        usuario: normalizeUser(insert.rows[0]),
      });
    }

    if (req.method === 'GET' && pathname === '/api/servicos') {
      const { rows } = await pool.query(
        'SELECT * FROM services ORDER BY created_at ASC NULLS LAST'
      );

      return sendJson(res, 200, rows.map(normalizeService));
    }

    if (req.method === 'POST' && pathname === '/api/servicos') {
      const body = await parseBody(req);
      const { nome, valor, duracao_minutos } = body || {};

      if (!nome || valor === undefined || duracao_minutos === undefined) {
        return sendJson(res, 400, { mensagem: 'Nome, valor e duração são obrigatórios.' });
      }

      const id = makeId();
      const { rows } = await pool.query(
        'INSERT INTO services (id,nome,valor,duracao_minutos) VALUES ($1,$2,$3,$4) RETURNING *',
        [id, String(nome).trim(), Number(valor), Number(duracao_minutos)]
      );

      return sendJson(res, 201, normalizeService(rows[0]));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/servicos/')) {
      const id = pathname.split('/').filter(Boolean).at(-1);
      if (!id) {
        return sendJson(res, 400, { mensagem: 'ID do serviço obrigatório.' });
      }

      await pool.query('DELETE FROM services WHERE id = $1', [id]);
      return sendJson(res, 204, {});
    }

    if (req.method === 'GET' && pathname === '/api/agendamentos') {
      const { rows } = await pool.query(`
        SELECT a.*, s.nome AS servico_nome, s.valor AS servico_valor, u.nome AS usuario_nome
        FROM appointments a
        LEFT JOIN services s ON s.id = a.servico_id
        LEFT JOIN users u ON u.id = a.usuario_id
        ORDER BY a.data_hora ASC NULLS LAST
      `);

      const mapped = rows.map((r) => ({
        id: r.id,
        servico_id: r.servico_id,
        servico_nome: r.servico_nome || 'Procedimento',
        valor: Number(r.valor ?? r.servico_valor ?? 0),
        data_hora: r.data_hora,
        usuario_id: r.usuario_id || null,
        usuario_nome: r.usuario_nome || null,
      }));

      return sendJson(res, 200, mapped);
    }

    if (req.method === 'POST' && pathname === '/api/agendamentos') {
      const body = await parseBody(req);
      const { servico_id, data_hora, usuario_id } = body || {};

      if (!servico_id || !data_hora) {
        return sendJson(res, 400, { mensagem: 'Serviço e data/hora são obrigatórios.' });
      }

      const { rows: servicoRows } = await pool.query(
        'SELECT * FROM services WHERE id = $1 LIMIT 1',
        [String(servico_id)]
      );

      if (!servicoRows[0]) {
        return sendJson(res, 400, { mensagem: 'Serviço inválido.' });
      }

      const resolvedUsuarioId = usuario_id || null;
      let usuario_nome = null;

      if (resolvedUsuarioId) {
        const { rows: usuarioRows } = await pool.query(
          'SELECT nome FROM users WHERE id = $1 LIMIT 1',
          [String(resolvedUsuarioId)]
        );
        usuario_nome = usuarioRows[0]?.nome || null;
      }

      const id = makeId();
      const { rows } = await pool.query(
        'INSERT INTO appointments (id,servico_id,servico_nome,valor,usuario_id,usuario_nome,data_hora) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [
          id,
          String(servico_id),
          servicoRows[0].nome,
          Number(servicoRows[0].valor || 0),
          resolvedUsuarioId,
          usuario_nome,
          new Date(data_hora).toISOString(),
        ]
      );

      return sendJson(res, 201, normalizeAppointment(rows[0]));
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/agendamentos/')) {
      const id = pathname.split('/').filter(Boolean).at(-1);
      if (!id) {
        return sendJson(res, 400, { mensagem: 'ID do agendamento obrigatório.' });
      }

      await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
      return sendJson(res, 204, {});
    }

    return sendJson(res, 404, { mensagem: 'Rota não encontrada.' });
  } catch (error) {
    console.error('Erro na API Vercel:', error);
    return sendJson(res, 500, {
      mensagem: 'Não foi possível processar a requisição.',
      error: String(error),
    });
  }
};

