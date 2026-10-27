const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const SESSION_SECRET = (process.env.SESSION_SECRET || 'studio-cilios-secret-dev').trim();

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

// CLIENTES
app.get('/api/clientes', requireAuth, requireMaster, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, data_nascimento, profissao, endereco, telefone, cpf FROM clients ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar clientes.' });
  }
});

app.post('/api/clientes', requireAuth, requireMaster, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const data_nascimento = String(req.body.data_nascimento || '').trim();
  const profissao = String(req.body.profissao || '').trim();
  const endereco = String(req.body.endereco || '').trim();
  const telefone = String(req.body.telefone || '').trim();
  const cpf = String(req.body.cpf || '').trim();

  if (!nome) {
    return res.status(400).json({ mensagem: 'O nome do cliente é obrigatório.' });
  }

  try {
    const id = makeId('cli');
    await pool.query(
      'INSERT INTO clients (id, nome, email, data_nascimento, profissao, endereco, telefone, cpf) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, nome, email, data_nascimento, profissao, endereco, telefone, cpf]
    );
    res.status(201).json({ id, nome });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cadastrar cliente.' });
  }
});

app.delete('/api/clientes/:id', requireAuth, requireMaster, async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    await pool.query('DELETE FROM client_fichas WHERE cliente_id = $1', [id]);
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    res.json({ mensagem: 'Cliente removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao remover cliente.' });
  }
});

// FICHA DE PROCEDIMENTO / ANAMNESE POR CLIENTE
app.get('/api/clientes/:id/ficha', requireAuth, requireMaster, async (req, res) => {
  const clienteId = String(req.params.id || '').trim();
  try {
    const result = await pool.query('SELECT * FROM client_fichas WHERE cliente_id = $1', [clienteId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar ficha.' });
  }
});

app.post('/api/clientes/:id/ficha', requireAuth, requireMaster, async (req, res) => {
  const clienteId = String(req.params.id || '').trim();
  const {
    usa_rimel,
    problemas_tireoide,
    possui_diabetes,
    gestante,
    procedimento_recente_olhos,
    procedimento_recente_olhos_qual,
    possui_alergia,
    alergia_qual,
    possui_glaucoma_ou_ocular,
    glaucoma_ocular_qual,
    esta_em_tratamento,
    informacoes_adicionais,
    mapping,
    estilo,
    modelo_fios,
    espessura,
    curvatura,
    adesivo_cola
  } = req.body;

  try {
    const existe = await pool.query('SELECT id FROM client_fichas WHERE cliente_id = $1', [clienteId]);
    
    if (existe.rows.length > 0) {
      await pool.query(
        `UPDATE client_fichas SET 
         usa_rimel = $1, 
         problemas_tireoide = $2, 
         possui_diabetes = $3, 
         gestante = $4,
         procedimento_recente_olhos = $5, 
         procedimento_recente_olhos_qual = $6, 
         possui_alergia = $7, 
         alergia_qual = $8, 
         possui_glaucoma_ou_ocular = $9, 
         glaucoma_ocular_qual = $10, 
         esta_em_tratamento = $11, 
         informacoes_adicionais = $12, 
         mapping = $13, 
         estilo = $14, 
         modelo_fios = $15, 
         espessura = $16, 
         curvatura = $17, 
         adesivo_cola = $18, 
         atualizado_em = NOW() 
         WHERE cliente_id = $19`,
        [
          String(usa_rimel || ''),                     // $1
          String(problemas_tireoide || ''),            // $2
          String(possui_diabetes || ''),               // $3
          String(gestante || ''),                      // $4
          String(procedimento_recente_olhos || ''),    // $5
          String(procedimento_recente_olhos_qual || ''),// $6
          String(possui_alergia || ''),                // $7
          String(alergia_qual || ''),                  // $8
          String(possui_glaucoma_ou_ocular || ''),     // $9
          String(glaucoma_ocular_qual || ''),          // $10
          String(esta_em_tratamento || ''),            // $11
          String(informacoes_adicionais || ''),        // $12
          String(mapping || ''),                       // $13
          String(estilo || ''),                        // $14
          String(modelo_fios || ''),                   // $15
          String(espessura || ''),                     // $16
          String(curvatura || ''),                     // $17
          String(adesivo_cola || ''),                  // $18
          clienteId                                    // $19
        ]
      );
    } else {
      const id = makeId('fich');
      await pool.query(
        `INSERT INTO client_fichas (
          id, cliente_id, usa_rimel, problemas_tireoide, possui_diabetes, gestante, 
          procedimento_recente_olhos, procedimento_recente_olhos_qual, possui_alergia, 
          alergia_qual, possui_glaucoma_ou_ocular, glaucoma_ocular_qual, esta_em_tratamento, 
          informacoes_adicionais, mapping, estilo, modelo_fios, espessura, curvatura, adesivo_cola
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          id,                                          // $1
          clienteId,                                   // $2
          String(usa_rimel || ''),                     // $3
          String(problemas_tireoide || ''),            // $4
          String(possui_diabetes || ''),               // $5
          String(gestante || ''),                      // $6
          String(procedimento_recente_olhos || ''),    // $7
          String(procedimento_recente_olhos_qual || ''),// $8
          String(possui_alergia || ''),                // $9
          String(alergia_qual || ''),                  // $10
          String(possui_glaucoma_ou_ocular || ''),     // $11
          String(glaucoma_ocular_qual || ''),          // $12
          String(esta_em_tratamento || ''),            // $13
          String(informacoes_adicionais || ''),        // $14
          String(mapping || ''),                       // $15
          String(estilo || ''),                        // $16
          String(modelo_fios || ''),                   // $17
          String(espessura || ''),                     // $18
          String(curvatura || ''),                     // $19
          String(adesivo_cola || '')                   // $20
        ]
      );
    }
    res.json({ mensagem: 'Ficha salva com sucesso!' });
  } catch (err) {
    console.error("Erro ao salvar ficha:", err);
    res.status(500).json({ mensagem: 'Erro interno ao salvar ficha.' });
  }
});

app.get('/api/clientes/:nome/historico', requireAuth, requireMaster, async (req, res) => {
  const nomeCliente = decodeURIComponent(req.params.nome || '').trim();
  try {
    const result = await pool.query('SELECT * FROM appointments WHERE LOWER(usuario_nome) = LOWER($1) ORDER BY data_hora DESC', [nomeCliente]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar histórico.' });
  }
});

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
    if (result.rows.length === 0) return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    res.json({ mensagem: 'Serviço removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao remover serviço.' });
  }
});

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
  const nomeClienteInput = String(req.body.usuario_nome || '').trim();
  
  let usuario_id = req.session.user.id;
  let usuario_nome = nomeClienteInput || req.session.user.nome;

  if (!servico_id || !data_hora) {
    return res.status(400).json({ mensagem: 'Selecione um procedimento e informe a data/hora.' });
  }

  try {
    const servicoRes = await pool.query('SELECT * FROM services WHERE id = $1', [servico_id]);
    const service = servicoRes.rows[0];
    if (!service) return res.status(404).json({ mensagem: 'Procedimento não encontrado.' });

    const id = makeId('apt');
    await pool.query(
      'INSERT INTO appointments (id, servico_id, servico_nome, valor, usuario_id, usuario_nome, data_hora, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, service.id, service.nome, service.valor, usuario_id, usuario_nome, data_hora, 'pendente']
    );

    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao criar agendamento.' });
  }
});

app.patch('/api/agendamentos/:id/concluir', requireAuth, requireMaster, async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const result = await pool.query('UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *', ['concluido', id]);
    if (result.rows.length === 0) return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    res.json({ mensagem: 'Atendimento concluído!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao concluir.' });
  }
});

app.patch('/api/agendamentos/:id/cancelar', requireAuth, requireMaster, async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const result = await pool.query('UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *', ['cancelado', id]);
    if (result.rows.length === 0) return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    res.json({ mensagem: 'Atendimento cancelado.' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cancelar.' });
  }
});

app.delete('/api/agendamentos/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id || '');
  try {
    const aptRes = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    const appointment = aptRes.rows[0];
    if (!appointment) return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });

    const canDelete = req.session.user.tipo === 'master' || req.session.user.id === appointment.usuario_id;
    if (!canDelete) return res.status(403).json({ mensagem: 'Você não pode remover este agendamento.' });

    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ mensagem: 'Agendamento removido.' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao remover agendamento.' });
  }
});

app.get('/api/master/metricas', requireAuth, requireMaster, async (req, res) => {
  const dataInicio = req.query.inicio;
  const dataFim = req.query.fim;
  try {
    let query = "SELECT * FROM appointments WHERE status = 'concluido'";
    let params = [];
    if (dataInicio && dataFim) {
      query += ' AND SUBSTRING(data_hora, 1, 10) >= $1 AND SUBSTRING(data_hora, 1, 10) <= $2';
      params.push(dataInicio, dataFim);
    }
    const result = await pool.query(query, params);
    const appointments = result.rows;
    const totalAtendimentos = appointments.length;
    let faturamentoTotal = 0;
    appointments.forEach((apt) => { faturamentoTotal += Number(apt.valor || 0); });
    const mediaFaturamentoPorAtendimento = totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0;

    res.json({
      totalAtendimentos,
      faturamentoTotal: faturamentoTotal.toFixed(2),
      mediaFaturamentoPorAtendimento: mediaFaturamentoPorAtendimento.toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao calcular métricas.' });
  }
});

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
        data_hora VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pendente'
      );

      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        data_nascimento VARCHAR(50),
        profissao VARCHAR(100),
        endereco TEXT,
        telefone VARCHAR(50),
        cpf VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS client_fichas (
        id VARCHAR(64) PRIMARY KEY,
        cliente_id VARCHAR(64) UNIQUE,
        usa_rimel VARCHAR(10),
        problemas_tireoide VARCHAR(10),
        possui_diabetes VARCHAR(10),
        gestante VARCHAR(10),
        procedimento_recente_olhos VARCHAR(10),
        procedimento_recente_olhos_qual TEXT,
        possui_alergia VARCHAR(10),
        alergia_qual TEXT,
        possui_glaucoma_ou_ocular VARCHAR(10),
        glaucoma_ocular_qual TEXT,
        esta_em_tratamento VARCHAR(10),
        informacoes_adicionais TEXT,
        mapping TEXT,
        estilo TEXT,
        modelo_fios TEXT,
        espessura VARCHAR(50),
        curvatura VARCHAR(50),
        adesivo_cola VARCHAR(100),
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    const masterEmail = '';
    const checkMaster = await pool.query('SELECT id FROM users WHERE email = $1', [masterEmail]);
    if (checkMaster.rows.length === 0) {
      const passwordHash = await bcrypt.hash('w18187', 10);
      await pool.query(
        'INSERT INTO users (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5)',
        ['master-1', 'Studio Master', masterEmail, passwordHash, 'master']
      );
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
};

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
  if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Studio rodando na porta ${PORT}`);
    });
  }
});

module.exports = app;
