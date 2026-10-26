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
  let appointmentEditId = null;

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
      console.error('apiFetch error:', { path, status: res.status, response: data });
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
    if (authDescription) authDescription.textContent = isRegister ? 'Cadastre-se para aproveitar a agenda do studio.' : 'Entre para consultar sua agenda ou marcar um procedimento.';

    const submitButton = authForm ? authForm.querySelector('button[type="submit"]') : null;
    if (submitButton) submitButton.textContent = isRegister ? 'Criar conta' : 'Entrar';

    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
      const active = button.dataset.authMode === mode;
      button.classList.toggle('is-active', active);
      button.style.color = active ? '#a855f7' : '#64748b';
      button.style.fontWeight = active ? '700' : '600';
    });
  };

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
  };

  const updateAdminVisibility = () => {
    const adminEls = document.querySelectorAll('.admin-only');
    const canAccessAdmin = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';
    adminEls.forEach((el) => {
      el.hidden = !canAccessAdmin;
    });

    const activeView = document.querySelector('.nav-link.is-active')?.dataset.view || 'agenda';
    if (activeView === 'cadastros' && !canAccessAdmin) {
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
    if (serviceSubmitButton) {
      const icon = serviceSubmitButton.querySelector('span');
      if (icon) {
        icon.textContent = editing ? '✓' : '＋';
      }
    }
  };

  const setAppointmentFormMode = (appointment = null) => {
    const editing = !!(appointment && appointment.id);
    appointmentEditId = appointment?.id || null;

    const cancelButton = document.getElementById('cancel-edit');
    if (cancelButton) cancelButton.hidden = !editing;

    const title = document.getElementById('booking-title');
    const description = document.getElementById('booking-description');
    if (title) title.textContent = editing ? 'Editar Agendamento' : 'Novo Agendamento';
    if (description) description.textContent = editing ? 'Ajuste a data e o procedimento deste agendamento.' : 'Escolha o procedimento de beleza e o horário desejado.';

    const submitButton = document.getElementById('reservation-submit');
    if (submitButton) {
      submitButton.innerHTML = editing
        ? 'Salvar alteração <span aria-hidden="true">↗</span>'
        : 'Confirmar agendamento <span aria-hidden="true">↗</span>';
    }
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
    serviceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const removeService = async (serviceId) => {
    if (!serviceId) return;
    const shouldDelete = window.confirm('Deseja realmente remover este procedimento?');
    if (!shouldDelete) return;

    const status = document.getElementById('service-message');
    try {
      await apiFetch(`/servicos/${encodeURIComponent(serviceId)}`, { method: 'DELETE' });
      setMessage(status, 'Serviço removido com sucesso!', false);
      serviceForm.reset();
      setServiceFormMode();
      await renderServices();
    } catch (error) {
      setMessage(status, error.message || 'Erro ao remover serviço.', true);
      showToast(error.message || 'Erro ao remover serviço', true);
    }
  };

  const removeAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    const shouldDelete = window.confirm('Deseja realmente excluir este agendamento?');
    if (!shouldDelete) return;

    const status = document.getElementById('appointment-message');
    try {
      await apiFetch(`/agendamentos/${encodeURIComponent(appointmentId)}`, { method: 'DELETE' });
      setMessage(status, 'Agendamento removido com sucesso!', false);
      appointmentForm.reset();
      setAppointmentFormMode();
      await renderAppointments();
    } catch (error) {
      setMessage(status, error.message || 'Erro ao remover agendamento.', true);
      showToast(error.message || 'Erro ao remover agendamento', true);
    }
  };

  const openAppointmentForEdit = async (appointmentId) => {
    if (!appointmentId) return;

    try {
      const appointments = await apiFetch('/agendamentos');
      const appointment = appointments.find((item) => String(item.id) === String(appointmentId));
      if (!appointment) {
        throw new Error('Agendamento não encontrado.');
      }

      if (serviceSelect) {
        const services = await apiFetch('/servicos');
        serviceSelect.innerHTML = '<option value="">Selecione um procedimento</option>';
        services.forEach((service) => {
          const option = document.createElement('option');
          option.value = service.id;
          option.textContent = `${service.nome} — ${formatCurrency(service.valor)}`;
          serviceSelect.appendChild(option);
        });
        serviceSelect.value = String(appointment.servico_id || '');
      }

      if (appointmentForm) {
        const dataInput = appointmentForm.querySelector('input[name="data_hora"]');
        if (dataInput) {
          dataInput.value = String(appointment.data_hora || '').slice(0, 16);
        }
      }

      setAppointmentFormMode(appointment);
      setActiveView('agenda');
      appointmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('Erro ao carregar agendamento para edição:', error);
      showToast(error.message || 'Não foi possível editar este agendamento.', true);
    }
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

            const editButton = row.querySelector('[data-action="edit-service"]');
            if (editButton) {
              editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                fillServiceForm(service);
              });
            }

            const deleteButton = row.querySelector('[data-action="delete-service"]');
            if (deleteButton) {
              deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                removeService(service.id);
              });
            }

            row.addEventListener('click', (event) => {
              if (event.target.closest('button')) return;
              fillServiceForm(service);
            });
            listEl.appendChild(row);
          });
        }
      }

      if (statServices) statServices.textContent = String(services.length || 0);
      if (adminCount) adminCount.textContent = String(services.length || 0);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      if (listEl) listEl.innerHTML = '<p>Não foi possível carregar os serviços.</p>';
      if (statServices) statServices.textContent = '0';
      showToast(error.message || 'Erro ao carregar serviços', true);
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

      const selectedFilter = appointmentFilter ? appointmentFilter.value : 'todos';

      let filtered = appointments;
      if (selectedFilter !== 'todos') {
        filtered = appointments.filter((appointment) => String(appointment.servico_id) === String(selectedFilter));
      }

      if (appointmentFilter) {
        const services = await apiFetch('/servicos');
        const options = ['<option value="todos">Todos os serviços</option>'];
        services.forEach((service) => {
          options.push(`<option value="${service.id}">${service.nome}</option>`);
        });
        appointmentFilter.innerHTML = options.join('');
        appointmentFilter.value = selectedFilter === 'todos' ? 'todos' : selectedFilter;
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

            const canManage = !!currentUser && (String(currentUser.tipo).toLowerCase() === 'master' || String(currentUser.id) === String(appointment.usuario_id));

            const left = document.createElement('div');
            left.innerHTML = `
              <strong>${appointment.servico_nome || 'Procedimento'}</strong>
              <div class="muted">${appointment.usuario_nome || 'Cliente'} • ${formatDateTime(appointment.data_hora)}</div>
            `;

            const right = document.createElement('div');
            right.className = 'value-badge';
            right.textContent = formatCurrency(appointment.valor);

            const actionWrap = document.createElement('div');
            actionWrap.style.display = 'flex';
            actionWrap.style.gap = '0.5rem';
            actionWrap.style.alignItems = 'center';
            actionWrap.style.marginTop = '0.5rem';

            if (canManage) {
              const editButton = document.createElement('button');
              editButton.type = 'button';
              editButton.className = 'button button-secondary';
              editButton.textContent = 'Editar';
              editButton.addEventListener('click', () => openAppointmentForEdit(appointment.id));

              const deleteButton = document.createElement('button');
              deleteButton.type = 'button';
              deleteButton.className = 'button button-danger';
              deleteButton.textContent = 'Excluir';
              deleteButton.addEventListener('click', () => removeAppointment(appointment.id));

              actionWrap.appendChild(editButton);
              actionWrap.appendChild(deleteButton);
            }

            const metaWrap = document.createElement('div');
            metaWrap.style.display = 'flex';
            metaWrap.style.flexDirection = 'column';
            metaWrap.style.alignItems = 'flex-end';
            metaWrap.appendChild(right);
            if (actionWrap.children.length) {
              metaWrap.appendChild(actionWrap);
            }

            row.appendChild(left);
            row.appendChild(metaWrap);
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
      if (listEl) listEl.innerHTML = '<p>Não foi possível carregar os agendamentos.</p>';
      if (statMine) statMine.textContent = '0';
      showToast(error.message || 'Erro ao carregar agendamentos', true);
    }
  };

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const viewName = button.dataset.view;
      const canAccessAdmin = !!currentUser && String(currentUser.tipo || '').toLowerCase() === 'master';

      if (viewName === 'cadastros' && !canAccessAdmin) {
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
          if (!nome || !email || !senha) {
            throw new Error('Nome, e-mail e senha são obrigatórios.');
          }

          await apiFetch('/cadastro', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha }),
          });

          setMessage(authMessage, 'Cadastro realizado com sucesso! Agora faça login.', false);
          setAuthMode('login');
          authForm.reset();

          const emailInput = authForm.querySelector('input[name="email"]');
          const passwordInput = authForm.querySelector('input[name="senha"]');
          if (emailInput) emailInput.value = defaultMasterEmail;
          if (passwordInput) passwordInput.value = defaultMasterPassword;

          return;
        }

        if (!email || !senha) {
          throw new Error('E-mail e senha são obrigatórios.');
        }

        const result = await apiFetch('/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        });

        saveSession(result.usuario);
        showApp();
        showToast(`Bem-vindo(a), ${result.usuario?.nome || 'cliente'}!`);
        authForm.reset();

        await renderServices();
        await renderAppointments();
      } catch (error) {
        setMessage(authMessage, error.message || 'Não foi possível continuar.', true);
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
        if (!nome || !valor || !duracao_minutos) {
          throw new Error('Preencha nome, valor e duração.');
        }

        if (id) {
          await apiFetch(`/servicos/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({ nome, valor, duracao_minutos }),
          });
          setMessage(status, 'Serviço atualizado com sucesso!', false);
        } else {
          await apiFetch('/servicos', {
            method: 'POST',
            body: JSON.stringify({ nome, valor, duracao_minutos }),
          });
          setMessage(status, 'Serviço salvo com sucesso!', false);
        }

        serviceForm.reset();
        setServiceFormMode();
        await renderServices();
      } catch (error) {
        setMessage(status, error.message || 'Erro ao salvar serviço.', true);
      }
    });

    if (serviceCancelButton) {
      serviceCancelButton.addEventListener('click', () => {
        const status = document.getElementById('service-message');
        serviceForm.reset();
        setServiceFormMode();
        setMessage(status, 'Edição cancelada.', false);
      });
    }
  }

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(appointmentForm);
      const servico_id = String(formData.get('servico_id') || '').trim();
      const data_hora = String(formData.get('data_hora') || '').trim();
      const status = document.getElementById('appointment-message');

      try {
        if (!servico_id || !data_hora) {
          throw new Error('Selecione um procedimento e informe a data/hora.');
        }

        if (appointmentEditId) {
          await apiFetch(`/agendamentos/${encodeURIComponent(appointmentEditId)}`, {
            method: 'PUT',
            body: JSON.stringify({ servico_id, data_hora }),
          });
          setMessage(status, 'Agendamento atualizado com sucesso!', false);
        } else {
          await apiFetch('/agendamentos', {
            method: 'POST',
            body: JSON.stringify({
              servico_id,
              data_hora,
              usuario_id: currentUser?.id || null,
            }),
          });
          setMessage(status, 'Agendamento criado com sucesso!', false);
        }

        appointmentForm.reset();
        setAppointmentFormMode();
        await renderAppointments();
      } catch (error) {
        setMessage(status, error.message || 'Erro ao salvar agendamento.', true);
      }
    });

    const cancelEditButton = document.getElementById('cancel-edit');
    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        appointmentForm.reset();
        setAppointmentFormMode();
        const status = document.getElementById('appointment-message');
        setMessage(status, 'Edição cancelada.', false);
      });
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearSession();
      showAuth();
      setAuthMode('login');

      if (authForm) {
        authForm.reset();
        const emailInput = authForm.querySelector('input[name="email"]');
        const passwordInput = authForm.querySelector('input[name="senha"]');
        if (emailInput) emailInput.value = defaultMasterEmail;
        if (passwordInput) passwordInput.value = defaultMasterPassword;
      }

      showToast('Sessão encerrada.');
    });
  }

  if (appointmentFilter) {
    appointmentFilter.addEventListener('change', renderAppointments);
  }

  const boot = async () => {
    setAuthMode('login');
    setServiceFormMode();
    setAppointmentFormMode();
    setActiveView('agenda');

    if (authForm) {
      const emailInput = authForm.querySelector('input[name="email"]');
      const passwordInput = authForm.querySelector('input[name="senha"]');
      if (emailInput) emailInput.value = defaultMasterEmail;
      if (passwordInput) passwordInput.value = defaultMasterPassword;
    }

    try {
      const savedUser = localStorage.getItem(storageKey);
      if (savedUser) {
        try {
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
        } catch (error) {
          console.warn('Sessão inválida:', error);
        }
      }

      clearSession();
      showAuth();
    } catch (error) {
      console.error('Erro no bootstrap da UI:', error);
    }
  };

  boot();
});
