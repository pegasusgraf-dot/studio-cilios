<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#fdf2f4"> 
    <title>Studio de Cílios — Agendamentos</title>
    <meta name="description" content="Sistema exclusivo para agendamento de procedimentos no Studio de Cílios.">
    <meta property="og:title" content="Studio de Cílios — Agendamentos">
    <meta property="og:description" content="Sistema exclusivo para agendamento de procedimentos no Studio de Cílios.">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    
    <!-- Biblioteca QRCode.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="app.js" defer></script>
    
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
      }

      .auth-layout {
        display: flex;
        width: 100vw;
        height: 100vh;
        background: #fff;
      }

      .auth-intro {
        flex: 1;
        background: linear-gradient(135deg, #e879f9 0%, #a855f7 100%);
        color: white;
        padding: 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }

      .auth-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        box-sizing: border-box;
        background: #ffffff;
      }

      .cracha-card {
        width: 320px;
        height: 200px;
        background: #ffffff;
        border: 2px dashed #cbd5e1;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        margin: 20px auto;
        text-align: center;
      }

      @media print {
        @page {
          size: 85.6mm 54mm;
          margin: 0;
        }

        body, html {
          width: 85.6mm;
          height: 54mm;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body * {
          visibility: hidden !important;
        }

        #cracha-view, #cracha-view * {
          visibility: visible !important;
        }

        #cracha-view {
          position: absolute;
          left: 0;
          top: 0;
          width: 85.6mm !important;
          height: 54mm !important;
          margin: 0 !important;
          padding: 2mm !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
        }

        .cracha-card {
          width: 100% !important;
          height: 100% !important;
          border: 2px dashed #000000 !important;
          box-shadow: none !important;
          margin: 0 !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
  </head>
  <body>

    <!-- TELA DE AUTENTICAÇÃO (SPLIT-SCREEN) -->
    <main id="auth-screen" class="auth-layout">
      <!-- Lado Esquerdo -->
      <section class="auth-intro">
        <div class="brand brand-light" style="font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
          <span class="brand-mark" style="background: white; color: #a855f7; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px;">S</span>
          <span>Studio<span class="brand-period" style="color: #fef08a;">.</span></span>
        </div>
        <div class="intro-copy">
          <p class="eyebrow" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; font-weight: bold;">BEM-VINDA AO STUDIO</p>
          <h1 style="font-size: 38px; line-height: 1.2; margin: 20px 0;">O olhar perfeito,<br><span style="color: #fef08a;">na hora certa.</span></h1>
          <p class="intro-note" style="font-size: 14px; opacity: 0.9;">Agende procedimentos de beleza e consulte sua agenda com facilidade.</p>
        </div>
        <div class="intro-foot" style="font-size: 12px; display: flex; align-items: center; gap: 8px; opacity: 0.85;">
          <span class="status-dot" style="width: 8px; height: 8px; background: #28a745; border-radius: 50%; display: inline-block;"></span> Atendimento em tempo real
        </div>
      </section>

      <!-- Lado Direito (Login) -->
      <section class="auth-panel">
        <div class="auth-box" style="width: 100%; max-width: 380px;">
          <div class="brand brand-dark" style="font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; color: #111;">
            <span class="brand-mark" style="background: #a855f7; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px;">S</span>
            <span>studio<span class="brand-period" style="color: #a855f7;">.</span></span>
          </div>
          <p class="eyebrow" id="auth-eyebrow" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-weight: bold;">BEM-VINDA DE VOLTA</p>
          <h2 id="auth-title" style="font-size: 24px; margin: 5px 0 8px 0; color: #111;">Acesse sua conta</h2>
          <p class="muted" style="color: #666; font-size: 13px; margin-bottom: 25px;" id="auth-description">Entre para consultar sua agenda ou marcar um procedimento.</p>
      
          <form id="auth-form" class="form-stack" style="display: flex; flex-direction: column; gap: 15px;">
            <label class="field" id="name-field" hidden style="display: flex; flex-direction: column; font-size: 12px; font-weight: bold; color: #333; gap: 5px;">
              Nome completo
              <input name="nome" autocomplete="name" maxlength="100" placeholder="Seu nome" style="width: 100%; padding: 10px 12px; border: 1px solid #ced4da; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
            </label>
            <label class="field" style="display: flex; flex-direction: column; font-size: 12px; font-weight: bold; color: #333; gap: 5px;">
              E-mail
              <input name="email" type="email" autocomplete="email" required maxlength="150" value="prodrigosilvacel@gmail.com.br" placeholder="seu@email.com" style="width: 100%; padding: 10px 12px; border: 1px solid #ced4da; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
            </label>
            <label class="field" style="display: flex; flex-direction: column; font-size: 12px; font-weight: bold; color: #333; gap: 5px;">
              Senha
              <input name="senha" type="password" autocomplete="current-password" required minlength="6" value="w18187" placeholder="Sua senha" style="width: 100%; padding: 10px 12px; border: 1px solid #ced4da; border-radius: 6px; box-sizing: border-box; font-size: 13px;">
            </label>
            <button class="button button-primary button-wide" type="submit" id="auth-submit" style="background: #a855f7; color: white; border: none; padding: 11px; font-size: 13px; font-weight: bold; border-radius: 8px; cursor: pointer;">Entrar</button>
            <p class="form-message" id="auth-message" role="status" style="color: #dc3545; font-size: 12px; margin-top: 5px;"></p>
          </form>

          <div class="auth-switch" style="margin-top: 1.2rem; display: flex; gap: 1rem; justify-content: center;">
            <button type="button" data-auth-mode="login" class="is-active" style="background:none; border:none; cursor:pointer; font-weight:600; color: #a855f7;">Já tenho conta</button>
            <button type="button" data-auth-mode="register" style="background:none; border:none; cursor:pointer; font-weight:600; color: #64748b;">Criar conta</button>
          </div>
        </div>
        <p class="auth-caption" style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 40px; text-align: center;">BELEZA E PRATICIDADE NO SEU DIA A DIA.<span class="brand-period" style="color: #a855f7;">.</span></p>
      </section>
    </main>

    <!-- TELA PRINCIPAL DO APLICATIVO -->
    <div id="app-screen" class="app-shell" hidden>
      <header class="topbar">
        <a class="brand brand-dark" href="#agenda" aria-label="Studio de Cílios, início">
          <span class="brand-mark" style="background: #a855f7; color: white;">S</span>
          <span>Studio de Cílios</span>
        </a>
        
        <nav class="main-nav" aria-label="Navegação principal">
          <button class="nav-link is-active" type="button" data-view="agenda">Agenda de Horários</button>
          <button class="nav-link admin-only" type="button" data-view="cadastros" hidden>Painel Master (Serviços) <span class="nav-count" id="admin-count">0</span></button>
          <button class="nav-link" type="button" data-view="cracha">Meu Crachá</button>
        </nav>

        <div class="account-area">
          <span class="account-avatar" id="account-avatar">A</span>
          <span class="account-name" id="account-name">Nome</span>
          <span class="account-role role-tag" id="account-role">Cliente</span>
          <button id="logout-button" class="icon-button" type="button" aria-label="Sair" title="Sair">↗</button>
        </div>
      </header>

      <main class="workspace">
        <section class="page-heading">
          <div>
            <p class="eyebrow" id="page-eyebrow">CENTRAL DE AGENDAMENTOS</p>
            <h1 id="page-title">Sua agenda, em ordem.</h1>
            <p class="muted" id="page-subtitle">Reserve seu horário ou acompanhe seus procedimentos.</p>
          </div>
          <div class="today-chip"><span class="today-icon" aria-hidden="true">▦</span><span id="today-label"></span></div>
        </section>

        <!-- STATS -->
        <section class="stats-row" aria-label="Resumo da agenda">
          <article class="stat-block">
            <span class="stat-label">SERVIÇOS DISPONÍVEIS</span>
            <strong id="stat-services">0</strong>
            <span class="stat-foot">procedimentos cadastrados</span>
          </article>
          <article class="stat-block">
            <span class="stat-label">MEUS AGENDAMENTOS</span>
            <strong id="stat-mine">0</strong>
            <span class="stat-foot">na agenda</span>
          </article>
          <article class="stat-block stat-accent">
            <span class="stat-label">PRÓXIMO HORÁRIO</span>
            <strong id="stat-next">—</strong>
            <span class="stat-foot" id="stat-next-detail">Nenhum agendamento futuro</span>
          </article>
        </section>

        <!-- PAINEL 1: AGENDA E AGENDAMENTO -->
        <section class="view-panel is-visible" id="agenda-view">
          <div class="agenda-layout">
            <section class="booking-panel card">
              <div class="panel-heading">
                <span class="panel-icon">＋</span>
                <div>
                  <h3 id="booking-title">Novo Agendamento</h3>
                  <p id="booking-description">Escolha o procedimento de beleza e o horário desejado.</p>
                </div>
              </div>
              
              <form id="appointment-form" class="form-stack">
                <label class="field">Procedimento
                  <select id="service-select" name="servico_id" required>
                    <option value="">Carregando serviços...</option>
                  </select>
                </label>
                <label class="field">Data e Hora
                  <input type="datetime-local" name="data_hora" required>
                </label>
                
                <div class="form-actions">
                  <button id="reservation-submit" type="submit" class="button button-primary button-wide" style="background: #a855f7;">Confirmar agendamento <span aria-hidden="true">↗</span></button>
                  <button id="cancel-edit" type="button" class="button button-secondary button-wide" hidden>Cancelar edição</button>
                </div>
                <p class="form-message" id="appointment-message" role="status"></p>
              </form>
            </section>

            <section class="reservations-panel card">
              <div class="filter-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Horários Marcados</h3>
                <label class="filter-label">
                  <select id="appointment-filter">
                    <option value="todos">Todos os serviços</option>
                  </select>
                </label>
              </div>
              <div id="appointment-list" class="reservation-list items-list" aria-live="polite"></div>
              <div id="empty-state" class="empty-state" hidden><span class="empty-symbol">▦</span><h3>Nenhum agendamento encontrado.</h3><p>Quando marcar um horário, ele aparecerá aqui.</p></div>
            </section>
          </div>
        </section>

        <!-- PAINEL 2: ADMINISTRAÇÃO MASTER (Serviços e Tratamentos) -->
        <section class="view-panel admin-only" id="cadastros-view" hidden>
          <div class="section-heading">
            <div>
              <p class="eyebrow">ADMINISTRAÇÃO MASTER</p>
              <h2>Gerenciar Catálogo de Tratamentos</h2>
            </div>
            <span class="admin-badge"><span class="status-dot"></span> Acesso master</span>
          </div>
          <div class="management-grid">
            <section class="management-panel card">
              <div class="panel-heading">
                <span class="panel-icon">⌂</span>
                <div>
                  <h3>Cadastrar Novo Tratamento / Serviço</h3>
                  <p>Adicione procedimentos de cílios, defina valores em R$ e duração.</p>
                </div>
              </div>
              
              <form id="service-form" class="form-stack compact-form">
                <label class="field">Nome do Procedimento
                  <input type="text" name="nome" required placeholder="Ex: Extensão Volume Russo">
                </label>
                <label class="field">Valor (R$)
                  <input type="number" step="0.01" name="valor" required placeholder="120.00">
                </label>
                <label class="field">Duração (em minutos)
                  <input type="number" name="duracao_minutos" required placeholder="90">
                </label>
                <button type="submit" class="button button-primary" style="background: #a855f7;">Adicionar serviço <span aria-hidden="true">＋</span></button>
                <p class="form-message" id="service-message" role="status"></p>
              </form>
            </section>

            <section class="management-panel card">
              <div class="panel-heading">
                <div>
                  <h3>Tratamentos Cadastrados</h3>
                  <p>Lista de todos os procedimentos ativos no studio.</p>
                </div>
              </div>
              <div class="management-list items-list" id="service-list"></div>
            </section>
          </div>
        </section>

        <!-- SEÇÃO DO CRACHÁ DIGITAL -->
        <section class="view-panel" id="cracha-view" hidden>
          <div class="section-heading">
            <div><p class="eyebrow">IDENTIFICAÇÃO</p><h2>Meu Crachá Digital</h2></div>
          </div>
          <div class="cracha-card">
            <div id="qrcode"></div>
            <p style="font-size: 11px; margin-top: 8px; color: #475569;">Escaneie para validar o perfil no studio</p>
          </div>
        </section>

        <!-- TOAST DE AVISO FLUTUANTE -->
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
      </main>
      
      <footer class="app-footer" style="text-align: center; padding: 1.5rem; display: block; font-size: 0.85rem; color: #64748b;">
        <span>STUDIO DE CÍLIOS<span class="brand-period">.</span></span> — <span>Beleza que transforma o olhar.</span>
      </footer>
    </div>

    <!-- SCRIPT DE GERAÇÃO DO QR CODE -->
    <script>
      const baseUrl = window.location.origin;
      const linkPerfil = `${baseUrl}/perfil.html?id=studio-cliente`;

      new QRCode(document.getElementById("qrcode"), {
        text: linkPerfil,
        width: 96,
        height: 96,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    </script>
  </body>
</html>
const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const {
  run,
  get,
  all,
  ensureDatabaseReady,
  isConstraintError,
  getDatabaseType,
  getDatabaseTarget
} = require('./db');

const app = express();
const port = process.env.VERCEL ? (Number(process.env.PORT) || 3000) : 3000;
const sessionMaxAge = 8 * 60 * 60 * 1000;
const isVercel = Boolean(process.env.VERCEL);
const sessionSecret = (process.env.SESSION_SECRET || '').trim() || 'chave-local-de-desenvolvimento-altere-em-producao';

app.use(express.json({ limit: '32kb' }));
app.set('trust proxy', 1);
app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return cookieSession({
    name: 'reserva_session',
    keys: [sessionSecret],
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: sessionMaxAge
  })(req, res, next);
});
app.use((req, res, next) => {
  const issuedAt = req.session?.issuedAt;
  if (req.session && (!Number.isFinite(issuedAt) || issuedAt > Date.now() || Date.now() - issuedAt > sessionMaxAge)) {
    req.session = null;
  }
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await ensureDatabaseReady();
    res.json({
      ok: true,
      ambiente: isVercel ? 'vercel' : 'node',
      tipo_banco: getDatabaseType(),
      origem_banco: getDatabaseTarget()
    });
  } catch (error) {
    console.error('Falha no healthcheck do banco:', error);
    res.status(500).json({ ok: false, mensagem: 'Falha na conexao com o banco de dados.' });
  }
});

app.use((req, res, next) => {
  ensureDatabaseReady().then(() => next()).catch((error) => {
    console.error('Erro ao preparar banco:', error);
    handleError(res, error);
  });
});

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ mensagem: 'Entre na sua conta para continuar.' });
  next();
}

function requireMaster(req, res, next) {
  if (req.session?.user?.tipo !== 'master') {
    return res.status(403).json({ mensagem: 'Apenas o usuario master pode fazer isso.' });
  }
  next();
}

function requireReservationEditor(req, res, next) {
  if (req.session?.user?.tipo !== 'master' && req.session?.user?.pode_editar !== 1) {
    return res.status(403).json({ mensagem: 'Sua conta nao tem permissao para editar reservas.' });
  }
  next();
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validFuelLevel(value) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 100);
}

async function getPreviousOdometer(resourceId, startsAt, excludeId) {
  const excludedReservation = excludeId ? ' AND id != ?' : '';
  const params = [resourceId, startsAt];
  if (excludeId) params.push(excludeId);
  return get(`SELECT km_final FROM reservas WHERE recurso_id = ? AND km_final IS NOT NULL
    AND datetime(data_fim) <= datetime(?)${excludedReservation}
    ORDER BY datetime(data_fim) DESC, id DESC LIMIT 1`, params);
}

async function updateFollowingOdometers(resourceId) {
  const rows = await all(`SELECT id, km_inicio, km_final FROM reservas WHERE recurso_id = ?
    ORDER BY datetime(data_inicio), id`, [resourceId]);
  let latestKm = null;
  for (const row of rows) {
    if (latestKm !== null) {
      await run('UPDATE reservas SET km_inicio = ? WHERE id = ?', [latestKm, row.id]);
    } else if (row.km_inicio !== null && row.km_inicio !== undefined) {
      latestKm = Number(row.km_inicio);
    }
    if (row.km_final !== null && row.km_final !== undefined) latestKm = Number(row.km_final);
  }
}

function handleError(res, error) {
  console.error('Erro na API:', error);
  res.status(500).json({ mensagem: 'Ocorreu um erro interno. Tente novamente.' });
}

app.post('/api/cadastro', async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  if (!nome || !email || senha.length < 6) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail e senha com pelo menos 6 caracteres.' });
  }
  try {
    const result = await run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', [
      nome, email, await bcrypt.hash(senha, 10), 'usuario'
    ]);
    res.status(201).json({ id: result.id, mensagem: 'Cadastro criado. Agora voce ja pode entrar.' });
  } catch (error) {
    if (isConstraintError(error)) return res.status(409).json({ mensagem: 'Este e-mail ja esta cadastrado.' });
    handleError(res, error);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!email || !senha) {
      return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });
    }

    const user = await get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });

    const storedPassword = typeof user.senha === 'string' ? user.senha : '';
    const passwordIsHashed = storedPassword.startsWith('$2');
    const passwordMatches = passwordIsHashed ? await bcrypt.compare(senha, storedPassword) : senha === storedPassword;
    if (!passwordMatches) return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });

    if (!passwordIsHashed) {
      await run('UPDATE usuarios SET senha = ? WHERE id = ?', [await bcrypt.hash(senha, 10), user.id]);
    }

    req.session = {
      issuedAt: Date.now(),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        pode_editar: Number(user.pode_editar || 0)
      }
    };
    res.json({ usuario: req.session.user });
  } catch (error) {
    console.error('Erro no login:', error);
    handleError(res, error);
  }
});

app.get('/api/sessao', (req, res) => res.json({ usuario: req.session?.user || null }));
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ mensagem: 'Sessao encerrada.' });
});

app.get('/api/usuarios', requireAuth, requireMaster, async (req, res) => {
  try {
    res.json(await all('SELECT id, nome, email, tipo, pode_editar FROM usuarios ORDER BY nome'));
  } catch (error) { handleError(res, error); }
});

app.post('/api/usuarios', requireAuth, requireMaster, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const podeEditar = req.body.pode_editar === true || req.body.pode_editar === '1' ? 1 : 0;
  if (!nome || !email || senha.length < 6) {
    return res.status(400).json({ mensagem: 'Informe nome, e-mail e senha com pelo menos 6 caracteres.' });
  }
  try {
    const result = await run('INSERT INTO usuarios (nome, email, senha, tipo, pode_editar) VALUES (?, ?, ?, ?, ?)', [
      nome, email, await bcrypt.hash(senha, 10), 'usuario', podeEditar
    ]);
    res.status(201).json({ id: result.id, mensagem: 'Usuario adicionado.' });
  } catch (error) {
    if (isConstraintError(error)) return res.status(409).json({ mensagem: 'Este e-mail ja esta cadastrado.' });
    handleError(res, error);
  }
});

app.put('/api/usuarios/:id', requireAuth, requireMaster, async (req, res) => {
  const id = Number(req.params.id);
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const podeEditar = req.body.pode_editar === true || req.body.pode_editar === '1' ? 1 : 0;

  if (!nome || !email) {
    return res.status(400).json({ mensagem: 'Informe nome e e-mail.' });
  }

  try {
    if (senha && senha.length >= 6) {
      const senhaHash = await bcrypt.hash(senha, 10);
      await run('UPDATE usuarios SET nome = ?, email = ?, senha = ?, pode_editar = ? WHERE id = ?', [
        nome, email, senhaHash, podeEditar, id
      ]);
    } else {
      await run('UPDATE usuarios SET nome = ?, email = ?, pode_editar = ? WHERE id = ?', [
        nome, email, podeEditar, id
      ]);
    }
    res.json({ mensagem: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    if (isConstraintError(error)) return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    handleError(res, error);
  }
});

app.patch('/api/usuarios/:id/permissao', requireAuth, requireMaster, async (req, res) => {
  const podeEditar = req.body.pode_editar === true || req.body.pode_editar === 1 || req.body.pode_editar === '1' ? 1 : 0;
  try {
    const result = await run('UPDATE usuarios SET pode_editar = ? WHERE id = ? AND tipo != ?', [
      podeEditar, req.params.id, 'master'
    ]);
    if (!result.changes) return res.status(404).json({ mensagem: 'Usuario comum nao encontrado.' });
    res.json({ mensagem: podeEditar ? 'Permissao para editar ativada.' : 'Permissao para editar removida.' });
  } catch (error) { handleError(res, error); }
});

app.delete('/api/usuarios/:id', requireAuth, requireMaster, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.user.id) return res.status(400).json({ mensagem: 'A conta master nao pode excluir a si mesma.' });
  try {
    await run('DELETE FROM reservas WHERE usuario_id = ?', [id]);
    const result = await run('DELETE FROM usuarios WHERE id = ? AND tipo != ?', [id, 'master']);
    if (!result.changes) return res.status(404).json({ mensagem: 'Usuario nao encontrado.' });
    res.json({ mensagem: 'Usuario excluido.' });
  } catch (error) { handleError(res, error); }
});

app.get('/api/recursos', requireAuth, async (req, res) => {
  try { res.json(await all('SELECT id, nome, tipo, numero FROM recursos ORDER BY tipo, nome')); }
  catch (error) { handleError(res, error); }
});

app.post('/api/recursos', requireAuth, requireMaster, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const tipo = String(req.body.tipo || '').trim();
  const numero = String(req.body.numero || '').trim();
  if (!nome || !['sala', 'carro', 'caminhao'].includes(tipo)) {
    return res.status(400).json({ mensagem: 'Informe um nome e um tipo valido.' });
  }
  try {
    const result = await run('INSERT INTO recursos (nome, tipo, numero) VALUES (?, ?, ?)', [nome, tipo, numero]);
    res.status(201).json({ id: result.id, nome, tipo, numero });
  } catch (error) { handleError(res, error); }
});

app.put('/api/recursos/:id', requireAuth, requireMaster, async (req, res) => {
  const id = Number(req.params.id);
  const nome = String(req.body.nome || '').trim();
  const tipo = String(req.body.tipo || '').trim();
  const numero = String(req.body.numero || '').trim();

  if (!nome || !['sala', 'carro', 'caminhao'].includes(tipo)) {
    return res.status(400).json({ mensagem: 'Informe um nome e um tipo válido.' });
  }

  try {
    await run('UPDATE recursos SET nome = ?, tipo = ?, numero = ? WHERE id = ?', [
      nome, tipo, numero, id
    ]);
    res.json({ mensagem: 'Recurso atualizado com sucesso.' });
  } catch (error) { handleError(res, error); }
});

app.delete('/api/recursos/:id', requireAuth, requireMaster, async (req, res) => {
  try {
    const reservations = await get('SELECT id FROM reservas WHERE recurso_id = ? LIMIT 1', [req.params.id]);
    if (reservations) return res.status(409).json({ mensagem: 'Este recurso tem reservas; exclua as reservas antes.' });
    const result = await run('DELETE FROM recursos WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ mensagem: 'Recurso nao encontrado.' });
    res.json({ mensagem: 'Recurso excluido.' });
  } catch (error) { handleError(res, error); }
});

const reservationSelect = `SELECT r.id, r.usuario_id, u.nome AS usuario, x.id AS recurso_id,
  x.nome AS recurso, x.tipo AS tipo_recurso, x.numero, r.motorista, r.destino, r.motivo,
  r.km_inicio, r.km_final, r.combustivel_inicio, r.combustivel_final,
  r.data_inicio AS inicio, r.data_fim AS fim
  FROM reservas r JOIN usuarios u ON u.id = r.usuario_id
  JOIN recursos x ON x.id = r.recurso_id`;

// TODOS OS USUÁRIOS LOGADOS PODEM VER TODAS AS RESERVAS
app.get('/api/reservas', requireAuth, async (req, res) => {
  try {
    let conditions = [];
    let params = [];

    const dataInicio = String(req.query.data_inicio || '').trim();
    const dataFim = String(req.query.data_fim || '').trim();

    if (dataInicio && dataFim) {
      conditions.push('date(r.data_inicio) <= ? AND date(r.data_fim) >= ?');
      params.push(dataFim, dataInicio);
    } else if (dataInicio) {
      conditions.push('date(r.data_fim) >= ?');
      params.push(dataInicio);
    } else if (dataFim) {
      conditions.push('date(r.data_inicio) <= ?');
      params.push(dataFim);
    } else {
      const hoje = new Date().toISOString().split('T')[0];
      conditions.push('date(r.data_fim) >= ?');
      params.push(hoje);
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    res.json(await all(`${reservationSelect}${where} ORDER BY r.data_inicio`, params));
  } catch (error) { handleError(res, error); }
});

// QUALQUER USUÁRIO LOGADO PODE FAZER UMA NOVA RESERVA
app.post('/api/reservas', requireAuth, async (req, res) => {
  const recursoId = Number(req.body.recurso_id);
  const inicio = String(req.body.inicio || '').trim();
  const fim = String(req.body.fim || '').trim();
  const motorista = String(req.body.motorista || '').trim();
  const destino = String(req.body.destino || '').trim();
  const motivo = String(req.body.motivo || '').trim();
  if (!recursoId || !inicio || !fim || new Date(inicio) >= new Date(fim)) {
    return res.status(400).json({ mensagem: 'Informe o recurso e um periodo valido, com fim depois do inicio.' });
  }
  try {
    const resource = await get('SELECT tipo FROM recursos WHERE id = ?', [recursoId]);
    if (!resource) return res.status(404).json({ mensagem: 'Recurso nao encontrado.' });
    if (resource.tipo !== 'sala' && (!motorista || !destino)) {
      return res.status(400).json({ mensagem: 'Para reservar veiculo, informe motorista e destino.' });
    }
    const conflict = await get(`SELECT id FROM reservas WHERE recurso_id = ?
      AND data_fim > ? AND data_inicio < ? LIMIT 1`, [recursoId, inicio, fim]);
    if (conflict) return res.status(409).json({ mensagem: 'Este recurso ja esta reservado nesse periodo.' });
    const previousOdometer = resource.tipo === 'sala' ? null : await getPreviousOdometer(recursoId, inicio);
    const kmInicio = previousOdometer?.km_final ?? null;
    const result = await run(`INSERT INTO reservas
      (usuario_id, recurso_id, motorista, destino, motivo, km_inicio, km_final,
       combustivel_final, data_inicio, data_fim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      req.session.user.id, recursoId, motorista, destino, motivo, kmInicio, null,
      null, inicio, fim
    ]);
    res.status(201).json({ id: result.id, mensagem: 'Reserva realizada.' });
  } catch (error) { handleError(res, error); }
});

// APENAS O MASTER (OU QUEM TEM PERMISSÃO) PODE EDITAR RESERVAS
app.put('/api/reservas/:id', requireAuth, requireReservationEditor, async (req, res) => {
  const recursoId = Number(req.body.recurso_id);
  const inicio = String(req.body.inicio || '').trim();
  const fim = String(req.body.fim || '').trim();
  const motorista = String(req.body.motorista || '').trim();
  const destino = String(req.body.destino || '').trim();
  const motivo = String(req.body.motivo || '').trim();
  const kmFinal = parseOptionalNumber(req.body.km_final);
  const combustivelFinal = parseOptionalNumber(req.body.combustivel_final);
  if (!recursoId || !inicio || !fim || new Date(inicio) >= new Date(fim)) {
    return res.status(400).json({ mensagem: 'Informe o recurso e um periodo valido, com fim depois do inicio.' });
  }
  if (Number.isNaN(kmFinal) || (kmFinal !== null && kmFinal < 0) || !validFuelLevel(combustivelFinal) ||
      ((kmFinal === null) !== (combustivelFinal === null))) {
    return res.status(400).json({ mensagem: 'Confira os valores de quilometragem e combustivel.' });
  }
  try {
    const [current, resource] = await Promise.all([
      get('SELECT id, recurso_id FROM reservas WHERE id = ?', [req.params.id]),
      get('SELECT tipo FROM recursos WHERE id = ?', [recursoId])
    ]);
    if (!current) return res.status(404).json({ mensagem: 'Reserva nao encontrada.' });
    if (!resource) return res.status(404).json({ mensagem: 'Recurso nao encontrado.' });
    if (resource.tipo !== 'sala' && (!motorista || !destino)) {
      return res.status(400).json({ mensagem: 'Para veiculos, informe motorista e destino.' });
    }
    const conflict = await get(`SELECT id FROM reservas WHERE recurso_id = ? AND id != ?
      AND data_fim > ? AND data_inicio < ? LIMIT 1`, [recursoId, req.params.id, inicio, fim]);
    if (conflict) return res.status(409).json({ mensagem: 'Este recurso ja esta reservado nesse periodo.' });
    const previousOdometer = resource.tipo === 'sala' ? null : await getPreviousOdometer(recursoId, inicio, req.params.id);
    const kmInicio = previousOdometer?.km_final ?? null;
    if (kmInicio !== null && kmFinal !== null && kmFinal < kmInicio) {
      return res.status(400).json({ mensagem: 'O KM de entrega nao pode ser menor que o KM inicial.' });
    }
    await run(`UPDATE reservas SET recurso_id = ?, motorista = ?, destino = ?, motivo = ?,
      km_inicio = ?, km_final = ?, combustivel_inicio = NULL, combustivel_final = ?,
      data_inicio = ?, data_fim = ? WHERE id = ?`, [
      recursoId, motorista, destino, motivo, kmInicio, kmFinal,
      combustivelFinal, inicio, fim, req.params.id
    ]);
    if (current.recurso_id !== recursoId) await updateFollowingOdometers(current.recurso_id);
    if (resource.tipo !== 'sala') await updateFollowingOdometers(recursoId);
    res.json({ mensagem: 'Reserva atualizada.' });
  } catch (error) { handleError(res, error); }
});

// APENAS O MASTER (OU QUEM TEM PERMISSÃO) PODE EXCLUIR RESERVAS
app.delete('/api/reservas/:id', requireAuth, requireReservationEditor, async (req, res) => {
  try {
    const result = req.session.user.tipo === 'master'
      ? await run('DELETE FROM reservas WHERE id = ?', [req.params.id])
      : await run('DELETE FROM reservas WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.user.id]);
    if (!result.changes) return res.status(404).json({ mensagem: 'Reserva nao encontrada.' });
    res.json({ mensagem: 'Reserva cancelada.' });
  } catch (error) { handleError(res, error); }
});

app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Rota da API nao encontrada.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  ensureDatabaseReady().then(() => {
    app.listen(port, '0.0.0.0', () => console.log(`Sistema de reservas disponivel em http://0.0.0.0:${port}`));
  }).catch((error) => {
    console.error('Falha ao inicializar o banco de dados:', error);
    process.exit(1);
  });
}

module.exports = app;
