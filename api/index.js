const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const sendJson = (res, status, payload = {}) => {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  if (!req.body && req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      return JSON.parse(raw || '{}');
    } catch (error) {
      return {};
    }
  }

  return req.body || {};
};

const makeId = () => `id_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

const normalizeUser = (usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  tipo: usuario.tipo || 'cliente',
});

const normalizeService = (servico) => ({
  id: servico.id,
  nome: servico.nome,
  valor: Number(servico.valor || 0),
  duracao_minutos: Number(servico.duracao_minutos || 0),
});

const normalizeAppointment = (agendamento) => ({
  id: agendamento.id,
  servico_id: agendamento.servico_id,
  servico_nome: agendamento.servico_nome || 'Procedimento',
  valor: Number(agendamento.valor || 0),
  data_hora: agendamento.data_hora,
  usuario_id: agendamento.usuario_id,
  usuario_nome: agendamento.usuario_nome || null,
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 204, {});
    }

    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (!process.env.DATABASE_URL) {
      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJson(res, 200, { ok: false, message: 'DATABASE_URL não configurada.' });
      }
      return sendJson(res, 500, { mensagem: 'DATABASE_URL não configurada no ambiente da Vercel.' });
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, message: 'PostgreSQL backend ok.', database: 'configured' });
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await parseBody(req);
      const { email, senha } = body || {};

      if (!email || !senha) {
        return sendJson(res, 400, { mensagem: 'E-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [normalizedEmail]);
      const usuario = rows[0];

      if (!usuario || String(usuario.senha) !== String(senha)) {
        return sendJson(res, 401, { mensagem: 'E-mail ou senha incorretos.' });
      }

      return sendJson(res, 200, { usuario: normalizeUser(usuario) });
    }

    if (req.method === 'POST' && pathname === '/api/cadastro') {
      const body = await parseBody(req);
      const { nome, email, senha } = body || {};

      if (!nome || !email || !senha) {
        return sendJson(res, 400, { mensagem: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const { rows: usuariosExistentes } = await pool.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (usuariosExistentes.length > 0) {
        return sendJson(res, 400, { mensagem: 'Este e-mail já está cadastrado.' });
      }

      const novoUsuario = {
        id: makeId(),
        nome: String(nome).trim(),
        email: normalizedEmail,
        senha: String(senha),
        tipo: 'cliente',
      };

      const { rows } = await pool.query(
        'INSERT INTO users (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [novoUsuario.id, novoUsuario.nome, novoUsuario.email, novoUsuario.senha, novoUsuario.tipo]
      );

      return sendJson(res, 201, { mensagem: 'Cadastrado com sucesso!', usuario: normalizeUser(rows[0]) });
    }

    if (req.method === 'GET' && pathname === '/api/servicos') {
      const { rows } = await pool.query('SELECT * FROM services ORDER BY created_at ASC NULLS LAST');
      return sendJson(res, 200, rows.map(normalizeService));
    }

    if (req.method === 'POST' && pathname === '/api/servicos') {
      const body = await parseBody(req);
      const { nome, valor, duracao_minutos } = body || {};

      if (!nome || valor === undefined || duracao_minutos === undefined) {
        return sendJson(res, 400, { mensagem: 'Nome, valor e duração são obrigatórios.' });
      }

      const novoServico = {
        id: makeId(),
        nome: String(nome).trim(),
        valor: Number(valor),
        duracao_minutos: Number(duracao_minutos),
      };

      const { rows } = await pool.query(
        'INSERT INTO services (id, nome, valor, duracao_minutos) VALUES ($1, $2, $3, $4) RETURNING *',
        [novoServico.id, novoServico.nome, novoServico.valor, novoServico.duracao_minutos]
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
        SELECT
          a.*,
          s.nome AS servico_nome,
          s.valor AS servico_valor,
          u.nome AS usuario_nome
        FROM appointments a
        LEFT JOIN services s ON s.id = a.servico_id
        LEFT JOIN users u ON u.id = a.usuario_id
        ORDER BY a.data_hora ASC NULLS LAST
      `);

      const result = rows.map((agendamento) => ({
        id: agendamento.id,
        servico_id: agendamento.servico_id,
        servico_nome: agendamento.servico_nome || 'Procedimento',
        valor: Number(agendamento.valor ?? agendamento.servico_valor ?? 0),
        data_hora: agendamento.data_hora,
        usuario_id: agendamento.usuario_id,
        usuario_nome: agendamento.usuario_nome || null,
      }));

      return sendJson(res, 200, result);
    }

    if (req.method === 'POST' && pathname === '/api/agendamentos') {
      const body = await parseBody(req);
      const { servico_id, data_hora, usuario_id } = body || {};

      if (!servico_id || !data_hora) {
        return sendJson(res, 400, { mensagem: 'Serviço e data/hora são obrigatórios.' });
      }

      const { rows: servicoRows } = await pool.query('SELECT * FROM services WHERE id = $1 LIMIT 1', [String(servico_id)]);
      if (!servicoRows[0]) {
        return sendJson(res, 400, { mensagem: 'Serviço inválido.' });
      }

      const resolvedUsuarioId = usuario_id || null;
      let usuario_nome = null;
      if (resolvedUsuarioId) {
        const { rows: usuarioRows } = await pool.query('SELECT nome FROM users WHERE id = $1 LIMIT 1', [String(resolvedUsuarioId)]);
        usuario_nome = usuarioRows[0]?.nome || null;
      }

      const novoAgendamento = {
        id: makeId(),
        servico_id: String(servico_id),
        servico_nome: servicoRows[0].nome,
        valor: Number(servicoRows[0].valor || 0),
        usuario_id: resolvedUsuarioId,
        usuario_nome,
        data_hora,
      };

      const { rows } = await pool.query(
        'INSERT INTO appointments (id, servico_id, servico_nome, valor, usuario_id, usuario_nome, data_hora) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [novoAgendamento.id, novoAgendamento.servico_id, novoAgendamento.servico_nome, novoAgendamento.valor, novoAgendamento.usuario_id, novoAgendamento.usuario_nome, novoAgendamento.data_hora]
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
    return sendJson(res, 500, { mensagem: 'Não foi possível processar a requisição.' });
  }
};
