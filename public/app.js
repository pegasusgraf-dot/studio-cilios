// public/app.js
// Front-end logic connecting public/index.html with /api endpoints

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  const apiBase = '/api';
  const toastEl = document.getElementById('toast');

  const showToast = (msg, timeout = 3000) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    setTimeout(() => toastEl.classList.remove('is-visible'), timeout);
  };

  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) throw new Error(data.mensagem || data.error || 'Erro na requisição');
    return data;
  };

  // Elements
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  const authForm = document.getElementById('auth-form');
  const authToggleButtons = Array.from(document.querySelectorAll('[data-auth-mode]'));
  const authMessage = document.getElementById('auth-message');
  const accountName = document.getElementById('account-name');
  const accountRole = document.getElementById('account-role');
  const accountAvatar = document.getElementById('account-avatar');
  const logoutButton = document.getElementById('logout-button');
  const navButtons = Array.from(document.querySelectorAll('.main-nav [data-view]'));
  const viewPanels = Array.from(document.querySelectorAll('.view-panel'));

  let authMode = 'login';

  authToggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      authToggleButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      authMode = btn.dataset.authMode;
      document.getElementById('name-field').hidden = authMode !== 'register';
      document.getElementById('auth-title').textContent = authMode === 'register' ? 'Crie sua conta' : 'Acesse sua conta';
      document.getElementById('auth-submit').textContent = authMode === 'register' ? 'Cadastrar' : 'Entrar ↗';
    });
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';
    const form = new FormData(authForm);
    const nome = form.get('nome');
    const email = form.get('email');
    const senha = form.get('senha');
    try {
      if (authMode === 'register') {
        await apiFetch('/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha }) });
        authMessage.textContent = 'Cadastro realizado. Faça login.';
        showToast('Cadastro realizado.');
        document.querySelector('[data-auth-mode="login"]').click();
      } else {
        const result = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
        currentUser = result.usuario;
        showApp();
        showToast(`Bem-vindo(a), ${currentUser.nome}`);
      }
    } catch (err) {
      authMessage.textContent = err.message || String(err);
      authMessage.classList.add('error');
    }
  });

  const showApp = async () => {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    accountName.textContent = currentUser.nome || 'Usuário';
    accountRole.textContent = currentUser.tipo || 'Cliente';
    accountAvatar.textContent = (currentUser.nome || 'U').slice(0,1).toUpperCase();

    const adminEls = Array.from(document.querySelectorAll('.admin-only'));
    if (currentUser.tipo !== 'master') adminEls.forEach(el => el.classList.add('hidden'));
    else adminEls.forEach(el => el.classList.remove('hidden'));

    await loadServices();
    await loadAppointments();
  };

  logoutButton.addEventListener('click', () => {
    currentUser = null;
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    showToast('Desconectado');
  });

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const view = btn.dataset.view;
      viewPanels.forEach(p => p.classList.remove('is-visible'));
      const el = document.getElementById(`${view}-view`);
      if (el) el.classList.add('is-visible');
    });
  });

  // Services
  const serviceForm = document.getElementById('service-form');
  const serviceMessage = document.getElementById('service-message');
  const serviceList = document.getElementById('service-list');

  if (serviceForm) {
    serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      serviceMessage.textContent = '';
      const form = new FormData(serviceForm);
      const nome = form.get('nome');
      const valor = form.get('valor');
      const duracao_minutos = form.get('duracao_minutos');
      try {
        await apiFetch('/servicos', { method: 'POST', body: JSON.stringify({ nome, valor, duracao_minutos }) });
        serviceMessage.textContent = 'Serviço salvo.';
        showToast('Serviço salvo');
        serviceForm.reset();
        await loadServices();
      } catch (err) {
        serviceMessage.textContent = err.message;
        serviceMessage.classList.add('error');
      }
    });
  }

  const loadServices = async () => {
    try {
      const servicos = await apiFetch('/servicos');
      const select = document.getElementById('service-select');
      if (select) {
        select.innerHTML = '<option value="">Selecione um procedimento</option>';
        servicos.forEach(s => {
          const o = document.createElement('option');
          o.value = s.id; o.textContent = `${s.nome} — R$ ${Number(s.valor).toFixed(2)}`;
          select.appendChild(o);
        });
      }
      if (serviceList) {
        serviceList.innerHTML = '';
        servicos.forEach(s => {
          const el = document.createElement('div');
          el.className = 'management-row';
          el.innerHTML = `<div><strong>${s.nome}</strong><div class="muted">R$ ${Number(s.valor).toFixed(2)} • ${s.duracao_minutos} min</div></div>`;
          serviceList.appendChild(el);
        });
      }
      const stat = document.getElementById('stat-services');
      if (stat) stat.textContent = servicos.length;
    } catch (err) {
      console.error('loadServices', err);
    }
  };

  // Appointments
  const appointmentForm = document.getElementById('appointment-form');
  const appointmentMessage = document.getElementById('appointment-message');
  const appointmentList = document.getElementById('appointment-list');

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      appointmentMessage.textContent = '';
      const form = new FormData(appointmentForm);
      const servico_id = form.get('servico_id');
      const data_hora = form.get('data_hora');
      if (!servico_id || !data_hora) { appointmentMessage.textContent = 'Preencha todos os campos.'; return; }
      try {
        const iso = new Date(data_hora).toISOString();
        await apiFetch('/agendamentos', { method: 'POST', body: JSON.stringify({ servico_id, data_hora: iso, usuario_id: currentUser?.id || null }) });
        appointmentForm.reset();
        showToast('Agendamento criado');
        await loadAppointments();
      } catch (err) {
        appointmentMessage.textContent = err.message;
        appointmentMessage.classList.add('error');
      }
    });
  }

  const loadAppointments = async () => {
    try {
      const agendamentos = await apiFetch('/agendamentos');
      appointmentList.innerHTML = '';
      if (!agendamentos.length) {
        document.getElementById('empty-state').hidden = false;
        return;
      }
      document.getElementById('empty-state').hidden = true;
      agendamentos.forEach(a => {
        const div = document.createElement('div');
        div.className = 'reservation-item';
        const date = new Date(a.data_hora);
        div.innerHTML = `
          <div class="date-tile"><strong>${('0'+date.getDate()).slice(-2)}</strong><small class="muted">${date.toLocaleDateString()}</small></div>
          <div class="reservation-main">
            <div><strong>${a.servico_nome}</strong></div>
            <div class="muted">${a.usuario_nome || 'Cliente'} — ${date.toLocaleString()}</div>
          </div>
        `;
        appointmentList.appendChild(div);
      });
      document.getElementById('stat-mine').textContent = agendamentos.filter(a => a.usuario_id === currentUser?.id).length || 0;
      const next = agendamentos.find(a => new Date(a.data_hora) > new Date());
      document.getElementById('stat-next').textContent = next ? new Date(next.data_hora).toLocaleString() : '—';
      document.getElementById('stat-next-detail').textContent = next ? `${next.servico_nome} • ${next.usuario_nome || 'Cliente'}` : 'Nenhum agendamento futuro';
    } catch (err) {
      console.error('loadAppointments', err);
    }
  };

  (async () => {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    try { await loadServices(); } catch (e) { /* ok */ }
  })();
});
