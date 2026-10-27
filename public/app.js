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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const apiFetch = async (path, options = {}) => {
    const mergedOptions = {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    const res = await fetch(`${apiBase}${path}`, mergedOptions);
    let data = {};
    try {
      data = await res.json();
    } catch (error) {
      data = {};
    }

    if (!res.ok) {
      const message = data?.mensagem || data?.error || data?.message || `Erro na requisição (${res.status})`;
      throw new Error(message);
    }
    return data;
  };

  const clearMessage = (element) => {
    if (element) element.textContent = '';
  };

  const setAuthMode = (mode) => {
    authMode = mode;
    const isRegister = mode === 'register';

    if (nameField) nameField.hidden = !isRegister;
    if (authEyebrow) authEyebrow.textContent = isRegister ? 'CRIE SUA CONTA' : 'BEM-VINDA DE VOLTA';
    if (authTitle) authTitle.textContent = isRegister ? 'Crie sua conta' : 'Acesse sua conta';
    if (authDescription) authDescription.textContent = isRegister ? 'Cadastre-se para aproveitar a agenda.' : 'Entre para consultar sua agenda ou marcar um procedimento.';

    const submitButton = authForm ? authForm.querySelector('button[type="submit"]') : null;
    if (submitButton) submitButton.textContent = isRegister ? 'Criar conta' : 'Entrar';

    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
      const active = button.dataset.authMode === mode;
      button.classList.toggle('is-active', active);
      button.style.color = active ? '#a855f7' : '#64748b';
      button.style.fontWeight = active ? '700' : '600';
    });
  };

  // Renderizar métricas com suporte a filtro por data
  const renderMasterMetrics = async () => {
    const totalEl = document.getElementById('metric-total-atendimentos');
    const faturamentoEl = document.getElementById('metric-faturamento');
    const mediaEl = document.getElementById('metric-media');
    const inicioInput = document.getElementById('filtro-inicio')?.value;
    const fimInput = document.getElementById('filtro-fim')?.value;

    let queryPath = '/master/metricas';
    if (inicioInput && fimInput) {
      queryPath += `?inicio=${inicioInput}&fim=${fimInput}`;
    }

    try {
      const metrics = await apiFetch(queryPath);
      if (totalEl) totalEl.textContent = metrics.totalAtendimentos || 0;
      if (faturamentoEl) faturamentoEl.textContent = formatCurrency(metrics.faturamentoTotal);
      if (mediaEl) mediaEl.textContent = formatCurrency(metrics.mediaFaturamentoPorAtendimento);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      showToast('Erro ao carregar relatório financeiro', true);
    }
  };

  const filtrarBtn = document.getElementById('filtrar-metricas');
  if (filtrarBtn) {
    filtrarBtn.addEventListener('click', renderMasterMetrics);
  }

  const setActiveView = (viewName) => {
    const targetView = String(viewName || 'agenda');

    navButtons.forEach((button) => {
      const isActive = button.dataset.view === targetView;
      button.classList.toggle('is-active', isActive);
    });

    viewPanels.forEach((panel) => {
      const panelName = panel.id.replace('-view', '');
      const isVisible = panelName === targetView;
      panel.hidden = !isVisible;
      panel.classList.toggle('is-visible', isVisible);
    });

    const adminPanel = document.getElementById('cadastros-view');
    if (adminPanel) {
      const canAccessAdmin = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';
      adminPanel.hidden = !canAccessAdmin || targetView !== 'cadastros';
    }

    const metricasPanel = document.getElementById('metricas-view');
    if (metricasPanel) {
      const canAccessMaster = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';
      metricasPanel.hidden = !canAccessMaster || targetView !== 'metricas';
    }

    if (targetView === 'metricas') {
      renderMasterMetrics();
    }
  };

  const updateAdminVisibility = () => {
    const adminEls = document.querySelectorAll('.admin-only');
    const canAccessAdmin = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';
    adminEls.forEach((el) => {
      el.hidden = !canAccessAdmin;
    });

    const activeView = document.querySelector('.nav-link.is-active')?.dataset.view || 'agenda';
    if ((activeView === 'cadastros' || activeView === 'metricas') && !canAccessAdmin) {
      setActiveView('agenda');
    }
  };

  const fillAccount = (user) => {
    if (!user) return;
    const name = user.nome || 'Cliente';
    const role = (user.tipo || 'cliente').toLowerCase();

    if (accountName) accountName.textContent = name;
    if (accountRole) accountRole.textContent = role === 'master' ? 'Master' : 'Cliente';
    if (accountAvatar) accountAvatar.textContent = String(name).trim().charAt(0).toUpperCase() || 'A';
  };

  const saveSession = (user) => {
    currentUser = user;
    localStorage.setItem(storageKey, JSON.stringify(user));
    fillAccount(user);
    updateAdminVisibility();
    setActiveView('agenda');
  };

  const clearSession = () => {
    currentUser = null;
    localStorage.removeItem(storageKey);
    if (accountName) accountName.textContent = 'Nome';
    if (accountRole) accountRole.textContent = 'Cliente';
    if (accountAvatar) accountAvatar.textContent = 'A';
    updateAdminVisibility();
    setActiveView('agenda');
  };

  const showAuth = () => {
    if (authScreen) authScreen.hidden = false;
    if (appScreen) appScreen.hidden = true;
    clearMessage(authMessage);
  };

  const showApp = () => {
    if (authScreen) authScreen.hidden = true;
    if (appScreen) appScreen.hidden = false;
    updateAdminVisibility();
    setActiveView('agenda');
  };

  const setServiceFormMode = (service = null) => {
    const editing = !!(service && service.id);
    if (serviceIdInput) serviceIdInput.value = service?.id || '';
    if (serviceSubmitButton) serviceSubmitButton.textContent = editing ? 'Salvar alterações' : 'Adicionar serviço';
    if (serviceCancelButton) serviceCancelButton.hidden = !editing;
  };

  const fillServiceForm = (service) => {
    if (!serviceForm) return;
    const nomeInput = serviceForm.querySelector('input[name="nome"]');
    const valorInput = serviceForm.querySelector('input[name="valor"]');
    const duracaoInput = serviceForm.querySelector('input[name="duracao_minutos"]');

    if (nomeInput) nomeInput.value = service?.nome || '';
    if (valorInput) valorInput.value = service?.valor ?? '';
    if (duracaoInput) duracaoInput.value = service?.duracao_minutos ?? '';
    setServiceFormMode(service);
  };

  const renderServices = async () => {
    const listEl = document.getElementById('service-list');
    const statServices = document.getElementById('stat-services');
    const adminCount = document.getElementById('admin-count');

    try {
      const services = await apiFetch('/servicos');

      if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Selecione um procedimento</option>';
        services.forEach((service) => {
          const option = document.createElement('option');
          option.value = service.id;
          option.textContent = `${service.nome} — ${formatCurrency(service.valor)}`;
          serviceSelect.appendChild(option);
        });
      }

      if (listEl) {
        listEl.innerHTML = '';
        if (!services.length) {
          listEl.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        } else {
          services.forEach((service) => {
            const row = document.createElement('div');
            row.className = 'service-item';
            row.style.cursor = 'pointer';
            row.innerHTML = `
              <div>
                <strong>${service.nome}</strong>
                <div class="muted">${formatCurrency(service.valor)} • ${service.duracao_minutos || 0} min</div>
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button type="button" class="button button-secondary" data-action="edit-service" data-service-id="${service.id}">Editar</button>
                <button type="button" class="button button-danger" data-action="delete-service" data-service-id="${service.id}">Excluir</button>
              </div>
            `;

            row.querySelector('[data-action="edit-service"]').addEventListener('click', (e) => {
              e.stopPropagation();
              fillServiceForm(service);
            });

            row.querySelector('[data-action="delete-service"]').addEventListener('click', async (e) => {
              e.stopPropagation();
              if (window.confirm('Deseja remover este serviço?')) {
                await apiFetch(`/servicos/${service.id}`, { method: 'DELETE' });
                await renderServices();
              }
            });

            listEl.appendChild(row);
          });
        }
      }

      if (statServices) statServices.textContent = String(services.length || 0);
      if (adminCount) adminCount.textContent = String(services.length || 0);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  };

  const concluirAtendimento = async (id) => {
    try {
      await apiFetch(`/agendamentos/${id}/concluir`, { method: 'PATCH' });
      showToast('Atendimento concluído com sucesso!');
      await renderAppointments();
    } catch (error) {
      showToast(error.message || 'Erro ao concluir atendimento', true);
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

      appointments.sort((a, b) => {
        const nomeA = String(a.usuario_nome || '').toLowerCase();
        const nomeB = String(b.usuario_nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
      });

      const selectedFilter = appointmentFilter ? appointmentFilter.value : 'todos';
      let filtered = appointments;
      if (selectedFilter !== 'todos') {
        filtered = appointments.filter((appointment) => String(appointment.servico_id) === String(selectedFilter));
      }

      if (listEl) {
        listEl.innerHTML = '';
        if (!filtered.length) {
          if (emptyState) emptyState.hidden = false;
          listEl.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        } else {
          if (emptyState) emptyState.hidden = true;
          filtered.forEach((appointment) => {
            const row = document.createElement('div');
            row.className = 'appointment-item';
            const isMaster = currentUser?.tipo === 'master';
            const isConcluido = appointment.status === 'concluido';

            row.innerHTML = `
              <div>
                <strong>${appointment.servico_nome || 'Procedimento'}</strong>
                <div class="muted">Cliente: <strong>${appointment.usuario_nome || 'Cliente'}</strong> • ${formatDateTime(appointment.data_hora)}</div>
                <div style="font-size: 11px; margin-top: 4px; color: ${isConcluido ? '#16a34a' : '#d97706'}; font-weight: bold;">
                  Status: ${isConcluido ? 'Concluído' : 'Pendente'}
                </div>
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <div class="value-badge">${formatCurrency(appointment.valor)}</div>
                ${isMaster && !isConcluido ? `<button type="button" class="button button-secondary" data-action="concluir" data-id="${appointment.id}" style="padding: 5px 10px; font-size: 11px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">Concluir</button>` : ''}
              </div>
            `;

            const concluirBtn = row.querySelector('[data-action="concluir"]');
            if (concluirBtn) {
              concluirBtn.addEventListener('click', () => concluirAtendimento(appointment.id));
            }

            listEl.appendChild(row);
          });
        }
      }

      if (statMine) statMine.textContent = String(filtered.length || 0);

      const next = [...appointments]
        .filter((appointment) => new Date(appointment.data_hora).getTime() > Date.now())
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))[0];

      if (next) {
        if (statNext) statNext.textContent = formatDateTime(next.data_hora);
        if (statNextDetail) statNextDetail.textContent = next.servico_nome || 'Procedimento';
      } else {
        if (statNext) statNext.textContent = '—';
        if (statNextDetail) statNextDetail.textContent = 'Nenhum agendamento futuro';
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  };

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const viewName = button.dataset.view;
      const canAccessAdmin = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';

      if ((viewName === 'cadastros' || viewName === 'metricas') && !canAccessAdmin) {
        showToast('Acesso restrito ao usuário master.', true);
        return;
      }

      setActiveView(viewName || 'agenda');
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(authForm);
      const nome = String(formData.get('nome') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const senha = String(formData.get('senha') || '').trim();

      try {
        if (authMode === 'register') {
          await apiFetch('/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha }) });
          setMessage(authMessage, 'Cadastro realizado com sucesso! Faça login.', false);
          setAuthMode('login');
          authForm.reset();
          return;
        }

        const result = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
        saveSession(result.usuario);
        showApp();
        showToast(`Bem-vindo(a), ${result.usuario?.nome || 'cliente'}!`);
        authForm.reset();
        await renderServices();
        await renderAppointments();
      } catch (error) {
        setMessage(authMessage, error.message || 'Erro ao autenticar', true);
        showToast(error.message || 'Erro ao autenticar', true);
      }
    });
  }

  if (serviceForm) {
    serviceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(serviceForm);
      const id = String(formData.get('id') || '').trim();
      const nome = String(formData.get('nome') || '').trim();
      const valor = Number(formData.get('valor') || 0);
      const duracao_minutos = Number(formData.get('duracao_minutos') || 0);
      const status = document.getElementById('service-message');

      try {
        if (id) {
          await apiFetch(`/servicos/${id}`, { method: 'PUT', body: JSON.stringify({ nome, valor, duracao_minutos }) });
          setMessage(status, 'Serviço atualizado com sucesso!', false);
        } else {
          await apiFetch('/servicos', { method: 'POST', body: JSON.stringify({ nome, valor, duracao_minutos }) });
          setMessage(status, 'Serviço salvo com sucesso!', false);
        }
        serviceForm.reset();
        setServiceFormMode();
        await renderServices();
      } catch (error) {
        setMessage(status, error.message || 'Erro ao salvar serviço.', true);
      }
    });
  }

  if (appointmentForm) {
    // Insere campo dinâmico de nome do cliente caso seja Master
    if (currentUser?.tipo === 'master' && !document.getElementById('custom-client-name')) {
      const container = document.createElement('label');
      container.className = 'field';
      container.innerHTML = `Nome do Cliente (Master)
        <input type="text" id="custom-client-name" name="usuario_nome" placeholder="Deixe em branco para usar o seu nome">
      `;
      appointmentForm.prepend(container);
    }

    appointmentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(appointmentForm);
      const servico_id = String(formData.get('servico_id') || '').trim();
      const data_hora = String(formData.get('data_hora') || '').trim();
      const usuario_nome = String(formData.get('usuario_nome') || '').trim();
      const status = document.getElementById('appointment-message');

      try {
        await apiFetch('/agendamentos', {
          method: 'POST',
          body: JSON.stringify({ servico_id, data_hora, usuario_nome }),
        });

        appointmentForm.reset();
        setMessage(status, 'Agendamento criado com sucesso!', false);
        await renderAppointments();
      } catch (error) {
        setMessage(status, error.message || 'Erro ao criar agendamento.', true);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearSession();
      showAuth();
      setAuthMode('login');
      showToast('Sessão encerrada.');
    });
  }

  const boot = async () => {
    setAuthMode('login');
    setServiceFormMode();
    setActiveView('agenda');

    try {
      const savedUser = localStorage.getItem(storageKey);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id) {
          currentUser = parsed;
          fillAccount(currentUser);
          updateAdminVisibility();
          showApp();
          await renderServices();
          await renderAppointments();
          return;
        }
      }
      clearSession();
      showAuth();
    } catch (error) {
      clearSession();
      showAuth();
    }
  };

  boot();
});
