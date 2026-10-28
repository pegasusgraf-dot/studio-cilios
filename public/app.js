document.addEventListener('DOMContentLoaded', () => {
  const apiBase = '/api';
  const storageKey = 'studio-cilios-user';

  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app-screen');
  const authForm = document.getElementById('auth-form');
  const authEyebrow = document.getElementById('auth-eyebrow');
  const authTitle = document.getElementById('auth-title');
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
  
  const clientForm = document.getElementById('client-form');
  const clientIdInput = document.getElementById('client-id');
  const clientFormTitle = document.getElementById('client-form-title');
  const clientSubmitBtn = document.getElementById('client-submit-btn');
  const clientCancelBtn = document.getElementById('client-cancel-btn');

  const fichaModal = document.getElementById('ficha-modal');
  const fichaForm = document.getElementById('ficha-form');
  const fichaClienteNome = document.getElementById('ficha-cliente-nome');
  const fichaClienteId = document.getElementById('ficha-cliente-id');
  const closeFichaModal = document.getElementById('close-ficha-modal');

  let currentUser = null;
  let authMode = 'login';
  let registeredClients = [];

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
    const res = await fetch(`${apiBase}${path}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options, }); let data = {}; try { data = await res.json(); } catch (e) { data = {}; } if (!res.ok) throw new Error(data?.mensagem \vert{}\vert{} data?.error \vert{}\vert{} `Erro (${res.status})`);
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
    const listaConcluidosEl = document.getElementById('lista-atendimentos-concluidos');
    const inicio = document.getElementById('filtro-inicio')?.value;
    const fim = document.getElementById('filtro-fim')?.value;

    let path = '/master/metricas';
    if (inicio && fim) path += `?inicio=${inicio}&fim=${fim}`;

    try {
      const metrics = await apiFetch(path);
      if (totalEl) totalEl.textContent = metrics.totalAtendimentos || 0;
      if (faturamentoEl) faturamentoEl.textContent = formatCurrency(metrics.faturamentoTotal);
      if (mediaEl) mediaEl.textContent = formatCurrency(metrics.mediaFaturamentoPorAtendimento);

      const appointments = await apiFetch('/agendamentos');
      const concluidos = appointments.filter(a => {
        if ((a.status || 'pendente') !== 'concluido') return false;
        if (!inicio && !fim) return true;
        const dataAtendimento = new Date(a.data_hora).toISOString().split('T')[0];
        if (inicio && dataAtendimento < inicio) return false;
        if (fim && dataAtendimento > fim) return false;
        return true;
      });

      if (listaConcluidosEl) {
        if (!concluidos.length) {
          listaConcluidosEl.innerHTML = '<p class="muted">Nenhum atendimento concluído encontrado no período.</p>';
        } else {
          listaConcluidosEl.innerHTML = '';
          concluidos.forEach(a => {
            const item = document.createElement('div');
            item.className = 'service-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '10px 12px';
            item.style.background = '#f8fafc';
            item.style.borderRadius = '6px';

            item.innerHTML = `
              <div>
                <strong>${a.servico_nome || 'Procedimento'}</strong>
                <div class="muted" style="font-size: 12px;">Cliente: <strong>${a.usuario_nome \vert{}\vert{} '—'}</strong> •${formatDateTime(a.data_hora)}</div>
              </div>
              <div style="font-weight: bold; color: #16a34a; font-size: 14px;">
                ${formatCurrency(a.valor)}
              </div>
            `;
            listaConcluidosEl.appendChild(item);
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('filtrar-metricas')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderMasterMetrics();
    showToast('Filtro aplicado!');
  });

  const exportarAtendimentosCSV = async () => {
    const inicio = document.getElementById('filtro-inicio')?.value;
    const fim = document.getElementById('filtro-fim')?.value;

    try {
      const appointments = await apiFetch('/agendamentos');
      const concluidos = appointments.filter(a => {
        if ((a.status || 'pendente') !== 'concluido') return false;
        if (!inicio && !fim) return true;
        const dataAtendimento = new Date(a.data_hora).toISOString().split('T')[0];
        if (inicio && dataAtendimento < inicio) return false;
        if (fim && dataAtendimento > fim) return false;
        return true;
      });

      if (!concluidos.length) {
        showToast('Nenhum atendimento concluído encontrado no período para exportar.', true);
        return;
      }

      let csvContent = 'ID;Cliente;Procedimento;Data/Hora;Valor (R$)\n';
      concluidos.forEach(a => {
        const nomeCliente = (a.usuario_nome || '').replace(/;/g, ',');
        const nomeServico = (a.servico_nome || '').replace(/;/g, ',');
        const dataFormatada = formatDateTime(a.data_hora);
        const valorFormatado = Number(a.valor || 0).toFixed(2).replace('.', ',');
        csvContent += `${a.id};${nomeCliente};${nomeServico};${dataFormatada};${valorFormatado}\n`; });  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.setAttribute('href', url); link.setAttribute('download', `atendimentos_concluidos_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Relatório CSV exportado com sucesso!');
    } catch (err) {
      showToast('Erro ao exportar CSV: ' + err.message, true);
    }
  };

  document.getElementById('btn-exportar-csv')?.addEventListener('click', (e) => {
    e.preventDefault();
    exportarAtendimentosCSV();
  });

  const setActiveView = (viewName) => {
    navButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === viewName));
    viewPanels.forEach(panel => {
      const isVisible = panel.id.replace('-view', '') === viewName;
      panel.hidden = !isVisible;
      panel.classList.toggle('is-visible', isVisible);
    });
    if (viewName === 'metricas') renderMasterMetrics();
    if (viewName === 'clientes') renderClients();
  };

  const updateAdminVisibility = () => {
    const isMaster = currentUser?.tipo === 'master';
    document.querySelectorAll('.admin-only').forEach(el => el.hidden = !isMaster);
    if (isMaster) loadRegisteredClients();
  };

  const loadRegisteredClients = async () => {
    try {
      registeredClients = await apiFetch('/clientes');
      if (currentUser?.tipo === 'master' && inputUsuarioNome) {
        let datalist = document.getElementById('clientes-datalist');
        if (!datalist) {
          datalist = document.createElement('datalist');
          datalist.id = 'clientes-datalist';
          document.body.appendChild(datalist);
          inputUsuarioNome.setAttribute('list', 'clientes-datalist');
        }
        datalist.innerHTML = '';
        registeredClients.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.nome;
          datalist.appendChild(opt);
        });
      }
    } catch (e) {}
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
        inputUsuarioNome.placeholder = 'Digite ou selecione a cliente cadastrada';
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
    loadRegisteredClients();
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
          opt.textContent = `${s.nome} —${formatCurrency(s.valor)}`;
          serviceSelect.appendChild(opt);
        });
      }
      const listEl = document.getElementById('service-list');
      if (listEl) {
        listEl.innerHTML = services.length ? '' : '<p>Nenhum serviço cadastrado.</p>';
        services.forEach(s => {
          const row = document.createElement('div');
          row.className = 'service-item';
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';

          row.innerHTML = `
            <div>
              <strong>${s.nome}</strong>
              <div class="muted">${formatCurrency(s.valor)} •${s.duracao_minutos} min</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="button" data-action="editar" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Editar</button>
              <button class="button button-danger" data-action="excluir" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Excluir</button>
            </div>
          `;

          row.querySelector('[data-action="editar"]').addEventListener('click', () => {
            serviceIdInput.value = s.id;
            serviceForm.nome.value = s.nome;
            serviceForm.valor.value = s.valor;
            serviceForm.duracao_minutos.value = s.duracao_minutos;
            if (serviceSubmitButton) serviceSubmitButton.textContent = 'Salvar Alterações';
            if (serviceCancelButton) serviceCancelButton.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });

          row.querySelector('[data-action="excluir"]').addEventListener('click', async () => {
            if (confirm(`Deseja excluir o procedimento "${s.nome}"?`)) {
              try {
                await apiFetch(`/servicos/${s.id}`, { method: 'DELETE' }); showToast('Serviço removido com sucesso!'); renderServices(); } catch (err) { showToast(err.message, true); } } });  listEl.appendChild(row); }); } } catch (e) { console.error(e); } };  serviceCancelButton?.addEventListener('click', () => { serviceForm.reset(); if (serviceIdInput) serviceIdInput.value = ''; if (serviceSubmitButton) serviceSubmitButton.textContent = 'Adicionar serviço'; if (serviceCancelButton) serviceCancelButton.hidden = true; });  serviceForm?.addEventListener('submit', async (e) => { e.preventDefault(); const formData = new FormData(serviceForm); const id = formData.get('id'); try { await apiFetch(id ? `/servicos/${id}` : '/servicos', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({
          nome: formData.get('nome'),
          valor: Number(formData.get('valor')),
          duracao_minutos: Number(formData.get('duracao_minutos'))
        })
      });
      serviceForm.reset();
      if (serviceIdInput) serviceIdInput.value = '';
      if (serviceSubmitButton) serviceSubmitButton.textContent = 'Adicionar serviço';
      if (serviceCancelButton) serviceCancelButton.hidden = true;
      renderServices();
      showToast(id ? 'Serviço atualizado com sucesso!' : 'Serviço cadastrado com sucesso!');
    } catch (e) { showToast(e.message, true); }
  });

  const renderClients = async () => {
    const listEl = document.getElementById('client-list');
    if (!listEl) return;
    try {
      const clients = await apiFetch('/clientes');
      registeredClients = clients;
      listEl.innerHTML = clients.length ? '' : '<p>Nenhum cliente cadastrado.</p>';
      clients.forEach(c => {
        const card = document.createElement('div');
        card.className = 'service-item';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';
        card.style.gap = '8px';

        card.innerHTML = `
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
            <strong>${c.nome}</strong>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="button" data-action="ficha" style="background: #a855f7; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Ficha</button>
              <button class="button" data-action="editar" style="background: #3b82f6; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Editar</button>
              <button class="button button-danger" data-action="excluir" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Excluir</button>
            </div>
          </div>
          <div class="muted" style="font-size: 12px; display: grid
