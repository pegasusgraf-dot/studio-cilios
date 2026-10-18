const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.mensagem || payload?.message || 'Erro ao carregar dados.';
    throw new Error(message);
  }

  return payload;
}

const authScreen = document.querySelector('#auth-screen');
const appScreen = document.querySelector('#app-screen');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const serviceSelect = document.querySelector('#service-select');
const appointmentForm = document.querySelector('#appointment-form');
const appointmentMessage = document.querySelector('#appointment-message');
const appointmentsList = document.querySelector('#appointment-list');
const emptyState = document.querySelector('#empty-state');
const serviceForm = document.querySelector('#service-form');
const serviceList = document.querySelector('#service-list');
const dateStartFilter = document.querySelector('#date-start-filter');
const dateEndFilter = document.querySelector('#date-end-filter');

let currentUser = null;
let services = [];
let appointments = [];
let authMode = 'login';
let toastTimer;

function setMessage(element, text, success = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('is-success', success);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function formatDate(value, options = { day: '2-digit', month: 'short' }) {
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function showAuth(mode = 'login') {
  authMode = mode;
  const registering = mode === 'register';
  const nameField = document.querySelector('#name-field');
  if (nameField) {
    nameField.hidden = !registering;
    nameField.querySelector('input').required = registering;
  }

  const authEyebrow = document.querySelector('#auth-eyebrow');
  const authTitle = document.querySelector('#auth-title');
  const authDescription = document.querySelector('#auth-description');
  const authSubmit = document.querySelector('#auth-submit');

  if (authEyebrow) authEyebrow.textContent = registering ? 'NOVO POR AQUI?' : 'BEM-VINDA AO STUDIO';
  if (authTitle) authTitle.textContent = registering ? 'Crie sua conta' : 'Acesse sua conta';
  if (authDescription) authDescription.textContent = registering
    ? 'Cadastre-se para agendar seus horários com facilidade.'
    : 'Entre para consultar sua agenda ou marcar um procedimento.';
  if (authSubmit) authSubmit.innerHTML = registering
    ? 'Cadastrar <span aria-hidden="true">↗</span>'
    : 'Entrar <span aria-hidden="true">↗</span>';

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.authMode === mode);
  });

  setMessage(authMessage, '');
}

function renderApp() {
  if (!currentUser) return;
  const isMaster = currentUser.tipo === 'master';
  if (authScreen) authScreen.hidden = true;
  if (appScreen) appScreen.hidden = false;

  const accountName = document.querySelector('#account-name');
  const accountAvatar = document.querySelector('#account-avatar');
  const accountRole = document.querySelector('#account-role');
  const todayLabel = document.querySelector('#today-label');

  if (accountName) accountName.textContent = currentUser.nome;
  if (accountAvatar) accountAvatar.textContent = currentUser.nome.trim().charAt(0).toUpperCase();
  if (accountRole) accountRole.textContent = isMaster ? 'Profissional Master' : 'Cliente';
  document.querySelectorAll('.admin-only').forEach((element) => {
    element.hidden = !isMaster;
  });

  if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'long',
    }).format(new Date());
  }
}

function renderServices() {
  if (!serviceSelect) return;

  const selected = serviceSelect.value;
  serviceSelect.innerHTML = '<option value="">Selecione um procedimento</option>' + services.map((service) => {
    const label = `${service.nome} — ${formatCurrency(service.valor)}`;
    return `<option value="${service.id}">${escapeHtml(label)} (${service.duracao_minutos} min)</option>`;
  }).join('');

  if (services.some((service) => String(service.id) === String(selected))) {
    serviceSelect.value = selected;
  }

  const statServices = document.querySelector('#stat-services');
  if (statServices) statServices.textContent = String(services.length);

  renderServiceList();
}

function renderAppointments() {
  if (!appointmentsList) return;

  const filter = document.querySelector('#appointment-filter')?.value || 'todos';
  const filtered = appointments.filter((item) => filter === 'todos' || String(item.servico_id) === String(filter));
  const now = Date.now();
  const upcoming = [...appointments]
    .filter((item) => new Date(item.data_hora).getTime() >= now)
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const ownCount = appointments.filter((item) => String(item.usuario_id) === String(currentUser?.id)).length;
  const nextStat = document.querySelector('#stat-next');
  const nextDetail = document.querySelector('#stat-next-detail');
  const statMine = document.querySelector('#stat-mine');

  if (statMine) statMine.textContent = String(ownCount);
  if (nextStat) nextStat.textContent = upcoming[0] ? formatDate(upcoming[0].data_hora) : '—';
  if (nextDetail) {
    nextDetail.textContent = upcoming[0]
      ? `${formatTime(upcoming[0].data_hora)} · ${upcoming[0].servico_nome}`
      : 'Nenhum agendamento futuro';
  }

  appointmentsList.innerHTML = filtered.map((item) => {
    const start = new Date(item.data_hora);
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(start).replace('.', '');
    const canCancel = currentUser?.tipo === 'master' || String(item.usuario_id) === String(currentUser?.id);

    return `
      <article class="reservation-item">
        <div class="date-tile"><strong>${String(start.getDate()).padStart(2, '0')}</strong><span>${escapeHtml(month)}</span></div>
        <div class="reservation-main">
          <div class="reservation-title-row">
            <strong class="reservation-title">${escapeHtml(item.servico_nome)}</strong>
            <span class="type-tag">${formatCurrency(item.valor)}</span>
          </div>
          <p class="reservation-time">Horário: ${formatDate(item.data_hora, { day: '2-digit', month: 'short', year: 'numeric' })} às ${formatTime(item.data_hora)}</p>
          <span class="reservation-owner">Cliente: ${escapeHtml(item.usuario_nome)}</span>
        </div>
        <div class="reservation-actions">
          ${canCancel ? `<button class="cancel-button" type="button" data-cancel-appointment="${item.id}" title="Cancelar horário">×</button>` : ''}
        </div>
      </article>
    `;
  }).join('');

  if (emptyState) emptyState.hidden = filtered.length > 0;
}

function renderServiceList() {
  if (!serviceList || currentUser?.tipo !== 'master') return;

  serviceList.innerHTML = services.map((service) => `
    <div class="management-row">
      <span class="row-symbol">✨</span>
      <div class="row-copy">
        <strong>${escapeHtml(service.nome)}</strong>
        <span>${formatCurrency(service.valor)} · ${service.duracao_minutos} minutos</span>
      </div>
      <div class="management-actions">
        <button class="row-delete" type="button" data-delete-service="${service.id}" title="Excluir serviço">×</button>
      </div>
    </div>
  `).join('');
}

async function loadDashboard() {
  try {
    const [servicos, agendamentos] = await Promise.all([
      apiFetch('/servicos'),
      apiFetch('/agendamentos'),
    ]);

    services = Array.isArray(servicos) ? servicos : [];
    appointments = Array.isArray(agendamentos) ? agendamentos : [];

    renderServices();
    renderAppointments();
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    setMessage(appointmentMessage, 'Não foi possível carregar os dados do sistema.');
  }
}

if (authForm) {
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => showAuth(button.dataset.authMode));
  });

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(authForm);
    const data = Object.fromEntries(formData.entries());
    const submit = document.querySelector('#auth-submit');
    submit.disabled = true;
    setMessage(authMessage, '');

    try {
      if (authMode === 'register') {
        await apiFetch('/cadastro', {
          method: 'POST',
          body: JSON.stringify({
            nome: data.nome,
            email: data.email,
            senha: data.senha,
          }),
        });

        authForm.reset();
        showAuth('login');
        setMessage(authMessage, 'Cadastro realizado com sucesso! Faça seu login.', true);
      } else {
        const payload = await apiFetch('/login', {
          method: 'POST',
          body: JSON.stringify({
            email: data.email,
            senha: data.senha,
          }),
        });

        currentUser = payload.usuario;
        renderApp();
        await loadDashboard();
        showToast('Bem-vindo ao sistema!');
      }
    } catch (error) {
      setMessage(authMessage, error.message);
    } finally {
      submit.disabled = false;
    }
  });
}

document.querySelectorAll('.main-nav button[data-view], .nav-link[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const viewName = button.dataset.view;
    document.querySelectorAll('.main-nav button, .nav-link').forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    document.querySelectorAll('.view-panel').forEach((panel) => {
      const isTarget = panel.id === `${viewName}-view`;
      panel.hidden = !isTarget;
      panel.classList.toggle('is-visible', isTarget);
    });
  });
});

if (document.querySelector('#logout-button')) {
  document.querySelector('#logout-button').addEventListener('click', async () => {
    currentUser = null;
    if (appScreen) appScreen.hidden = true;
    if (authScreen) authScreen.hidden = false;
    if (authForm) authForm.reset();
    showAuth('login');
    try {
      await apiFetch('/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout sem backend disponível.', error);
    }
    showToast('Sessão encerrada.');
  });
}

if (appointmentForm) {
  appointmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(appointmentForm);
    const data = Object.fromEntries(formData.entries());

    if (!currentUser) {
      setMessage(appointmentMessage, 'Faça login antes de agendar.');
      return;
    }

    const servicoObj = services.find((service) => String(service.id) === String(data.servico_id));
    if (!servicoObj) {
      setMessage(appointmentMessage, 'Selecione um procedimento válido.');
      return;
    }

    try {
      await apiFetch('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          servico_id: data.servico_id,
          data_hora: data.data_hora,
          usuario_id: currentUser.id,
        }),
      });

      appointmentForm.reset();
      showToast('Agendamento realizado com sucesso!');
      await loadDashboard();
    } catch (error) {
      setMessage(appointmentMessage, error.message);
    }
  });
}

if (serviceForm) {
  serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(serviceForm);
    const data = Object.fromEntries(formData.entries());

    try {
      await apiFetch('/servicos', {
        method: 'POST',
        body: JSON.stringify({
          nome: data.nome,
          valor: data.valor,
          duracao_minutos: data.duracao_minutos,
        }),
      });

      serviceForm.reset();
      showToast('Serviço cadastrado com sucesso!');
      await loadDashboard();
    } catch (error) {
      setMessage(document.querySelector('#service-message'), error.message);
    }
  });
}

appointmentsList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-cancel-appointment]');
  if (!button) return;

  try {
    await apiFetch(`/agendamentos/${button.dataset.cancelAppointment}`, { method: 'DELETE' });
    showToast('Agendamento cancelado.');
    await loadDashboard();
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
  }
});

serviceList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-service]');
  if (!button) return;

  try {
    await apiFetch(`/servicos/${button.dataset.deleteService}`, { method: 'DELETE' });
    showToast('Serviço removido.');
    await loadDashboard();
  } catch (error) {
    console.error('Erro ao remover serviço:', error);
  }
});

if (dateStartFilter) {
  dateStartFilter.addEventListener('change', () => renderAppointments());
}

if (dateEndFilter) {
  dateEndFilter.addEventListener('change', () => renderAppointments());
}

showAuth('login');

if (authScreen) authScreen.hidden = false;
if (appScreen) appScreen.hidden = true;

