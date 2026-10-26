const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const SESSION_SECRET = (process.env.SESSION_SECRET || 'studio-cilios-secret-dev').trim();

const state = {
  users: [],
  services: [],
  appointments: []
};

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

const buildDefaultUser = async () => {
  const passwordHash = await bcrypt.hash('w18187', 10);
  return {
    id: 'master-1',
    nome: 'Studio Master',
    email: 'prodrigosilvacel@gmail.com.br',
    senha: passwordHash,
    tipo: 'master'
  };
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

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ambiente: 'vercel-or-local',
    usuarios: state.users.length,
    servicos: state.services.length
  });
});

app.get('/api/sessao', (req, res) => {
  res.json({ usuario: req.session?.user || null });
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ mensagem: 'Sessão encerrada.' });
});

app.post('/api/cadastro', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '').trim();

  if (!nome || !email || senha.length < 6) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail e senha com pelo menos 6 caracteres.' });
  }

  const jaExiste = state.users.some((user) => user.email === email);
  if (jaExiste) {
    return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
  }

  const user = {
    id: makeId('user'),
    nome,
    email,
    senha: await bcrypt.hash(senha, 10),
    tipo: 'cliente'
  };

  state.users.push(user);

  res.status(201).json({
    id: user.id,
    mensagem: 'Cadastro realizado com sucesso.'
  });
});

app.post('/api/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '').trim();

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });
  }

  const user = state.users.find((item) => item.email === email);
  if (!user) {
    return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
  }

  const passwordMatches = await bcrypt.compare(senha, user.senha);
  if (!passwordMatches) {
    return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
  }

  req.session = {
    user: normalizeUser(user)
  };

  res.json({ usuario: req.session.user });
});

app.get('/api/usuarios/:id', (req, res) => {
  const id = String(req.params.id || '').trim();

  if (!id || id === 'studio-cliente') {
    return res.json({
      id: 'studio-cliente',
      nome: 'Studio de Cílios',
      cargo: 'Master',
      fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
    });
  }

  const user = state.users.find((item) => String(item.id) === String(id));
  if (!user) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
  }

  res.json({
    id: user.id,
    nome: user.nome,
    cargo: user.tipo === 'master' ? 'Master' : 'Cliente',
    fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
  });
});

app.get('/api/servicos', (req, res) => {
  res.json(state.services);
});

app.post('/api/servicos', requireAuth, requireMaster, (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const valor = Number(req.body.valor || 0);
  const duracao_minutos = Number(req.body.duracao_minutos || 0);

  if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(duracao_minutos) || duracao_minutos <= 0) {
    return res.status(400).json({ mensagem: 'Preencha nome, valor e duração válidos.' });
  }

  const service = {
    id: makeId('serv'),
    nome,
    valor,
    duracao_minutos
  };

  state.services.push(service);
  res.status(201).json(service);
});

app.get('/api/agendamentos', requireAuth, (req, res) => {
  const user = req.session.user;

  if (user.tipo === 'master') {
    return res.json(state.appointments);
  }

  res.json(
    state.appointments.filter((appointment) => String(appointment.usuario_id) === String(user.id))
  );
});

app.post('/api/agendamentos', requireAuth, (req, res) => {
  const servico_id = String(req.body.servico_id || '').trim();
  const data_hora = String(req.body.data_hora || '').trim();
  const usuario_id = String(req.body.usuario_id || req.session.user.id);

  if (!servico_id || !data_hora) {
    return res.status(400).json({ mensagem: 'Selecione um procedimento e informe a data/hora.' });
  }

  const service = state.services.find((item) => String(item.id) === String(servico_id));
  if (!service) {
    return res.status(404).json({ mensagem: 'Procedimento não encontrado.' });
  }

  const appointment = {
    id: makeId('apt'),
    servico_id: service.id,
    servico_nome: service.nome,
    valor: service.valor,
    usuario_id: usuario_id,
    usuario_nome: req.session.user.nome,
    data_hora
  };

  state.appointments.push(appointment);
  res.status(201).json(appointment);
});

app.delete('/api/agendamentos/:id', requireAuth, (req, res) => {
  const id = String(req.params.id || '');
  const appointment = state.appointments.find((item) => String(item.id) === id);

  if (!appointment) {
    return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
  }

  const canDelete = req.session.user.tipo === 'master' || req.session.user.id === appointment.usuario_id;
  if (!canDelete) {
    return res.status(403).json({ mensagem: 'Você não pode remover este agendamento.' });
  }

  state.appointments = state.appointments.filter((item) => String(item.id) !== id);
  res.json({ mensagem: 'Agendamento removido.' });
});

app.get('/api/usuarios', requireAuth, requireMaster, (req, res) => {
  res.json(
    state.users.map((user) => ({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      pode_editar: user.tipo === 'master' ? 1 : 0
    }))
  );
});

const seed = async () => {
  const seedUser = await buildDefaultUser();
  if (!state.users.some((user) => user.email === seedUser.email)) {
    state.users.push(seedUser);
  }

  if (!state.services.length) {
    state.services.push(
      { id: 'serv-1', nome: 'Alongamento de cílios', valor: 180, duracao_minutos: 90 },
      { id: 'serv-2', nome: 'Volume russo', valor: 240, duracao_minutos: 120 },
      { id: 'serv-3', nome: 'Lash lifting', valor: 220, duracao_minutos: 75 }
    );
  }
};

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

seed().then(() => {
  if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Studio de cílios rodando em http://localhost:${PORT}`);
    });
  }
});

module.exports = app;
