document.addEventListener('DOMContentLoaded', () => {
  const apiBase = '/api';
  const storageKey = 'studio-cilios-user';
  const defaultMasterEmail = 'prodrigosilvacel@gmail.com.br';
  const defaultMasterPassword = 'w18187';

  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  const authForm = document.getElementById('auth-form');
  const authEyebrow = document.getElementById('auth-eyebrow');
  const authTitle = document.getElementById('auth-title');
  const authDescription = document.getElementById('auth-description');
  const authMessage = document.getElementById('auth-message');
  const nameField = document.getElementById('name-field');
  const serviceForm = document.getElementById('service-form');
  const serviceIdInput = document.getElementById('service-id');
  const serviceSubmitButton = document.getElementById('service-submit');
  const serviceCancelButton = document.getElementById('service-cancel');
  const appointmentForm = document.getElementById('appointment-form');
  const serviceSelect = document.getElementById('service-select');
  const appointmentFilter = document.getElementById('appointment-filter');
  const accountName = document.getElementById('account-name');
  const accountRole = document.getElementById('account-role');
  const accountAvatar = document.getElementById('account-avatar');
  const logoutButton = document.getElementById('logout-button');
  const toast = document.getElementById('toast');
  const navButtons = document.querySelectorAll('.nav-link');
  const viewPanels = document.querySelectorAll('.view-panel');
  const inputUsuarioNome = document.getElementById('input-usuario-nome');

  let currentUser = null;
  let authMode = 'login';

  const setMessage = (element, message, isError = false) => {
    if (!element) return;
    element.textContent = message || '';
    element.style.color = isError ? '#dc3545' : '#16a34a';
  };

  const showToast = (message, isError = false) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('is-error');
    if (isError) toast.classList.add('is-error');
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${apiBase}${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) throw new Error(data?.mensagem || data?.error || `Erro (${res.status})`);
    return data;
  };

  const setAuthMode = (mode) => {
    authMode = mode;
    const isRegister = mode === 'register';
    if (nameField) nameField.hidden = !isRegister;
    if (authEyebrow) authEyebrow.textContent = isRegister ? 'CRIE SUA CONTA' : 'BEM-VINDA DE VOLTA';
    if (authTitle) authTitle.textContent = isRegister ? 'Crie sua conta' : 'Acesse sua conta';
    const submitButton = authForm ? authForm.querySelector('button[type="submit"]') : null;
    if (submitButton) submitButton.textContent = isRegister ? 'Criar conta' : 'Entrar';
  };

  const renderMasterMetrics = async () => {
    const totalEl = document.getElementById('metric-total-atendimentos');
    const faturamentoEl = document.getElementById('metric-faturamento');
    const mediaEl = document.getElementById('metric-media');
    const inicio = document.getElementById('filtro-inicio')?.value;
    const fim = document.getElementById('filtro-fim')?.value;

    let path = '/master/metricas';
    if (inicio && fim) path += `?inicio=${inicio}&fim=${fim}`;

    try {
      const metrics = await apiFetch(path);
      if (totalEl) totalEl.textContent = metrics.totalAtendimentos || 0;
      if (faturamentoEl) faturamentoEl.textContent = formatCurrency(metrics.faturamentoTotal);
      if (mediaEl) mediaEl.textContent = formatCurrency(metrics.mediaFaturamentoPorAtendimento);
    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('filtrar-metricas')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderMasterMetrics();
    showToast('Filtro aplicado!');
  });

  const setActiveView = (viewName) => {
    navButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === viewName));
    viewPanels.forEach(panel => {
      const isVisible = panel.id.replace('-view', '') === viewName;
      panel.hidden = !isVisible;
      panel.classList.toggle('is-visible', isVisible);
    });
    if (viewName === 'metricas') renderMasterMetrics();
  };

  const updateAdminVisibility = () => {
    const isMaster = currentUser?.tipo === 'master';
    document.querySelectorAll('.admin-only').forEach(el => el.hidden = !isMaster);
  };

  const fillAccount = (user) => {
    if (!user) return;
    if (accountName) accountName.textContent = user.nome || 'Cliente';
    if (accountRole) accountRole.textContent = user.tipo === 'master' ? 'Master' : 'Cliente';
    if (accountAvatar) accountAvatar.textContent = String(user.nome || 'A').charAt(0).toUpperCase();
    
    if (inputUsuarioNome) {
      if (user.tipo !== 'master') {
        inputUsuarioNome.value = user.nome;
        inputUsuarioNome.readOnly = true;
      } else {
        inputUsuarioNome.value = '';
        inputUsuarioNome.readOnly = false;
        inputUsuarioNome.placeholder = 'Nome da cliente';
      }
    }
  };

  const saveSession = (user) => {
    currentUser = user;
    localStorage.setItem(storageKey, JSON.stringify(user));
    fillAccount(user);
    updateAdminVisibility();
    authScreen.hidden = true;
    appScreen.hidden = false;
    setActiveView('agenda');
    renderServices();
    renderAppointments();
  };

  const clearSession = () => {
    currentUser = null;
    localStorage.removeItem(storageKey);
    updateAdminVisibility();
    authScreen.hidden = false;
    appScreen.hidden = true;
  };

  const renderServices = async () => {
    const statServices = document.getElementById('stat-services');
    const adminCount = document.getElementById('admin-count');
    try {
      const services = await apiFetch('/servicos');
      if (statServices) statServices.textContent = String(services.length || 0);
      if (adminCount) adminCount.textContent = String(services.length || 0);

      if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Selecione um procedimento</option>';
        services.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.nome} — ${formatCurrency(s.valor)}`;
          serviceSelect.appendChild(opt);
        });
      }
      const listEl = document.getElementById('service-list');
      if (listEl) {
        listEl.innerHTML = services.length ? '' : '<p>Nenhum serviço cadastrado.</p>';
        services.forEach(s => {
          const row = document.createElement('div');
          row.className = 'service-item';
          row.innerHTML = `<div><strong>${s.nome}</strong><div class="muted">${formatCurrency(s.valor)} • ${s.duracao_minutos} min</div></div>
            <button class="button button-danger" data-id="${s.id}">Excluir</button>`;
          row.querySelector('button').addEventListener('click', async () => {
            if (confirm('Deseja excluir?')) {
              await apiFetch(`/servicos/${s.id}`, { method: 'DELETE' });
              renderServices();
            }
          });
          listEl.appendChild(row);
        });
      }
    } catch (e) { console.error(e); }
  };

  const alterarStatusAtendimento = async (id, acao) => {
    try {
      await apiFetch(`/agendamentos/${id}/${acao}`, { method: 'PATCH' });
      showToast(acao === 'concluir' ? 'Atendimento concluído!' : 'Atendimento cancelado!');
      await renderAppointments();
      await renderMasterMetrics();
    } catch (e) {
      showToast(e.message || 'Erro ao atualizar atendimento', true);
    }
  };

  const renderAppointments = async () => {
    const listEl = document.getElementById('appointment-list');
    const statMine = document.getElementById('stat-mine');
    const statNext = document.getElementById('stat-next');
    const statNextDetail = document.getElementById('stat-next-detail');
    const emptyState = document.getElementById('empty-state');

    try {
      const appointments = await apiFetch('/agendamentos');
      const filterVal = appointmentFilter ? appointmentFilter.value : 'todos';
      let filtered = filterVal === 'todos' ? appointments : appointments.filter(a => String(a.servico_id) === filterVal);

      if (statMine) statMine.textContent = String(filtered.length || 0);

      const next = [...appointments]
        .filter(a => (a.status || 'pendente') === 'pendente' && new Date(a.data_hora).getTime() > Date.now())
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))[0];

      if (next) {
        if (statNext) statNext.textContent = formatDateTime(next.data_hora);
        if (statNextDetail) statNextDetail.textContent = `${next.servico_nome} (${next.usuario_nome})`;
      } else {
        if (statNext) statNext.textContent = '—';
        if (statNextDetail) statNextDetail.textContent = 'Nenhum agendamento futuro';
      }

      if (listEl) {
        listEl.innerHTML = '';
        if (!filtered.length) {
          if (emptyState) emptyState.hidden = false;
          listEl.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        } else {
          if (emptyState) emptyState.hidden = true;
          filtered.forEach(apt => {
            const row = document.createElement('div');
            row.className = 'appointment-item';
            const isMaster = currentUser?.tipo === 'master';
            const status = apt.status || 'pendente';

            let statusCor = '#d97706';
            if (status === 'concluido') statusCor = '#16a34a';
            if (status === 'cancelado') statusCor = '#dc3545';

            row.innerHTML = `
              <div>
                <strong>${apt.servico_nome}</strong>
                <div class="muted">Cliente: <strong>${apt.usuario_nome}</strong> • ${formatDateTime(apt.data_hora)}</div>
                <div style="font-size: 11px; margin-top: 4px; color: ${statusCor}; font-weight: bold;">
                  Status: ${status.toUpperCase()}
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <div class="value-badge">${formatCurrency(apt.valor)}</div>
                ${isMaster && status === 'pendente' ? `
                  <button class="button" data-action="concluir" data-id="${apt.id}" style="background:#16a34a; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Concluir</button>
                  <button class="button" data-action="cancelar" data-id="${apt.id}" style="background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Não veio</button>
                ` : ''}
              </div>
            `;

            row.querySelector('[data-action="concluir"]')?.addEventListener('click', () => alterarStatusAtendimento(apt.id, 'concluir'));
            row.querySelector('[data-action="cancelar"]')?.addEventListener('click', () => alterarStatusAtendimento(apt.id, 'cancelar'));

            listEl.appendChild(row);
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => setAuthMode(btn.dataset.authMode)));

  navButtons.forEach(btn => btn.addEventListener('click', () => {
    if ((btn.dataset.view === 'cadastros' || btn.dataset.view === 'metricas') && currentUser?.tipo !== 'master') {
      showToast('Acesso restrito ao master.', true);
      return;
    }
    setActiveView(btn.dataset.view);
  }));

  appointmentFilter?.addEventListener('change', renderAppointments);

  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(authForm);
    const nome = formData.get('nome');
    const email = formData.get('email');
    const senha = formData.get('senha');

    try {
      if (authMode === 'register') {
        await apiFetch('/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha }) });
        setMessage(authMessage, 'Cadastrado com sucesso! Faça login.', false);
        setAuthMode('login');
        return;
      }
      const res = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
      saveSession(res.usuario);
      showToast(`Bem-vinda, ${res.usuario.nome}!`);
    } catch (err) {
      setMessage(authMessage, err.message, true);
    }
  });

  appointmentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(appointmentForm);
    try {
      await apiFetch('/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          servico_id: formData.get('servico_id'),
          data_hora: formData.get('data_hora'),
          usuario_nome: formData.get('usuario_nome')
        })
      });
      appointmentForm.reset();
      if (currentUser?.tipo !== 'master' && inputUsuarioNome) inputUsuarioNome.value = currentUser.nome;
      showToast('Agendamento criado com sucesso!');
      renderAppointments();
      renderMasterMetrics();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  serviceForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(serviceForm);
    const id = formData.get('id');
    try {
      await apiFetch(id ? `/servicos/${id}` : '/servicos', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({
          nome: formData.get('nome'),
          valor: Number(formData.get('valor')),
          duracao_minutos: Number(formData.get('duracao_minutos'))
        })
      });
      serviceForm.reset();
      renderServices();
      showToast('Serviço salvo com sucesso!');
    } catch (e) { showToast(e.message, true); }
  });

  logoutButton?.addEventListener('click', () => {
    clearSession();
    showToast('Sessão encerrada.');
  });

  const boot = async () => {
    setAuthMode('login');
    setActiveView('agenda');
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        currentUser = JSON.parse(saved);
        fillAccount(currentUser);
        updateAdminVisibility();
        appScreen.hidden = false;
        authScreen.hidden = true;
        renderServices();
        renderAppointments();
        return;
      }
    } catch (e) {}
    authScreen.hidden = false;
    appScreen.hidden = true;
  };

  boot();
});
