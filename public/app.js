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
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';

          row.innerHTML = `
            <div>
              <strong>${s.nome}</strong>
              <div class="muted">${formatCurrency(s.valor)} • ${s.duracao_minutos} min</div>
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
                await apiFetch(`/servicos/${s.id}`, { method: 'DELETE' });
                showToast('Serviço removido com sucesso!');
                renderServices();
              } catch (err) {
                showToast(err.message, true);
              }
            }
          });

          listEl.appendChild(row);
        });
      }
    } catch (e) { console.error(e); }
  };

  serviceCancelButton?.addEventListener('click', () => {
    serviceForm.reset();
    if (serviceIdInput) serviceIdInput.value = '';
    if (serviceSubmitButton) serviceSubmitButton.textContent = 'Adicionar serviço';
    if (serviceCancelButton) serviceCancelButton.hidden = true;
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
              <button class="button" data-action="ficha" style="background: #a855f7; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Ficha / Histórico</button>
              <button class="button button-danger" data-action="excluir" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Excluir</button>
            </div>
          </div>
          <div class="muted" style="font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 100%;">
            <span><strong>CPF:</strong> ${c.cpf || '—'}</span>
            <span><strong>Tel:</strong> ${c.telefone || '—'}</span>
            <span><strong>Nascimento:</strong> ${c.data_nascimento || '—'}</span>
            <span><strong>Profissão:</strong> ${c.profissao || '—'}</span>
            <span style="grid-column: span 2;"><strong>Endereço:</strong> ${c.endereco || '—'}</span>
            <span style="grid-column: span 2;"><strong>E-mail:</strong> ${c.email || '—'}</span>
          </div>
        `;

        card.querySelector('[data-action="excluir"]').addEventListener('click', async () => {
          if (confirm(`Deseja excluir o cadastro de ${c.nome}?`)) {
            try {
              await apiFetch(`/clientes/${c.id}`, { method: 'DELETE' });
              showToast('Cliente removido!');
              renderClients();
            } catch (err) {
              showToast(err.message, true);
            }
          }
        });

        card.querySelector('[data-action="ficha"]').addEventListener('click', () => {
          abrirFichaModal(c);
        });

        listEl.appendChild(card);
      });
    } catch (e) { console.error(e); }
  };

  const abrirFichaModal = async (cliente) => {
    if (!fichaModal) return;
    fichaClienteNome.textContent = cliente.nome;
    fichaClienteId.value = cliente.id;
    fichaForm.reset();

    const historicoBox = document.getElementById('ficha-historico-lista');
    historicoBox.innerHTML = 'Carregando histórico...';

    try {
      const hist = await apiFetch(`/clientes/${encodeURIComponent(cliente.nome)}/historico`);
      if (!hist.length) {
        historicoBox.innerHTML = '<p class="muted">Nenhum atendimento realizado ainda.</p>';
      } else {
        let html = '<ul style="margin:0; padding-left:15px; font-size:12px;">';
        hist.forEach(h => {
          html += `<li>${formatDateTime(h.data_hora)} — <strong>${h.servico_nome}</strong> (${formatCurrency(h.valor)}) [Status: ${h.status}]</li>`;
        });
        html += '</ul>';
        historicoBox.innerHTML = html;
      }
    } catch (err) {
      historicoBox.innerHTML = '<span style="color:red; font-size:12px;">Erro ao carregar histórico.</span>';
    }

    try {
      const ficha = await apiFetch(`/clientes/${cliente.id}/ficha`);
      if (ficha) {
        const setRadio = (name, val) => {
          if (!val) return;
          const radio = fichaForm.querySelector(`input[name="${name}"][value="${val}"]`);
          if (radio) radio.checked = true;
        };

        setRadio('usa_rimel', ficha.usa_rimel);
        setRadio('problemas_tireoide', ficha.problemas_tireoide);
        setRadio('possui_diabetes', ficha.possui_diabetes);
        setRadio('gestante', ficha.gestante);
        setRadio('procedimento_recente_olhos', ficha.procedimento_recente_olhos);
        setRadio('possui_alergia', ficha.possui_alergia);
        setRadio('possui_glaucoma_ou_ocular', ficha.possui_glaucoma_ou_ocular);
        setRadio('esta_em_tratamento', ficha.esta_em_tratamento);

        if (fichaForm.procedimento_recente_olhos_qual) fichaForm.procedimento_recente_olhos_qual.value = ficha.procedimento_recente_olhos_qual || '';
        if (fichaForm.alergia_qual) fichaForm.alergia_qual.value = ficha.alergia_qual || '';
        if (fichaForm.glaucoma_ocular_qual) fichaForm.glaucoma_ocular_qual.value = ficha.glaucoma_ocular_qual || '';
        if (fichaForm.informacoes_adicionais) fichaForm.informacoes_adicionais.value = ficha.informacoes_adicionais || '';
        if (fichaForm.mapping) fichaForm.mapping.value = ficha.mapping || '';
        if (fichaForm.estilo) fichaForm.estilo.value = ficha.estilo || '';
        if (fichaForm.modelo_fios) fichaForm.modelo_fios.value = ficha.modelo_fios || '';
        if (fichaForm.espessura) fichaForm.espessura.value = ficha.espessura || '';
        if (fichaForm.curvatura) fichaForm.curvatura.value = ficha.curvatura || '';
        if (fichaForm.adesivo_cola) fichaForm.adesivo_cola.value = ficha.adesivo_cola || '';
      }
    } catch (e) {}

    fichaModal.style.display = 'flex';
  };

  closeFichaModal?.addEventListener('click', () => {
    fichaModal.style.display = 'none';
  });

  // BOTÃO DE IMPRESSÃO DA FICHA
  document.getElementById('btn-imprimir-ficha')?.addEventListener('click', () => {
    window.print();
  });

  fichaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clienteId = fichaClienteId.value;
    
    if (!clienteId) {
      showToast('Erro: ID do cliente não encontrado.', true);
      return;
    }

    const formData = new FormData(fichaForm);

    const getRadioVal = (name) => {
      const checked = fichaForm.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : '';
    };

    const data = {
      usa_rimel: getRadioVal('usa_rimel'),
      problemas_tireoide: getRadioVal('problemas_tireoide'),
      possui_diabetes: getRadioVal('possui_diabetes'),
      gestante: getRadioVal('gestante'),
      procedimento_recente_olhos: getRadioVal('procedimento_recente_olhos'),
      procedimento_recente_olhos_qual: formData.get('procedimento_recente_olhos_qual') || '',
      possui_alergia: getRadioVal('possui_alergia'),
      alergia_qual: formData.get('alergia_qual') || '',
      possui_glaucoma_ou_ocular: getRadioVal('possui_glaucoma_ou_ocular'),
      glaucoma_ocular_qual: formData.get('glaucoma_ocular_qual') || '',
      esta_em_tratamento: getRadioVal('esta_em_tratamento'),
      informacoes_adicionais: formData.get('informacoes_adicionais') || '',
      mapping: formData.get('mapping') || '',
      estilo: formData.get('estilo') || '',
      modelo_fios: formData.get('modelo_fios') || '',
      espessura: formData.get('espessura') || '',
      curvatura: formData.get('curvatura') || '',
      adesivo_cola: formData.get('adesivo_cola') || ''
    };

    try {
      await apiFetch(`/clientes/${clienteId}/ficha`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Ficha de atendimento salva com sucesso!');
      fichaModal.style.display = 'none';
    } catch (err) {
      showToast(err.message || 'Erro ao salvar ficha', true);
    }
  });

  clientForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(clientForm);
    try {
      await apiFetch('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: formData.get('nome'),
          email: formData.get('email'),
          data_nascimento: formData.get('data_nascimento'),
          profissao: formData.get('profissao'),
          endereco: formData.get('endereco'),
          telefone: formData.get('telefone'),
          cpf: formData.get('cpf')
        })
      });
      clientForm.reset();
      renderClients();
      loadRegisteredClients();
      showToast('Cliente cadastrado com sucesso!');
    } catch (err) {
      showToast(err.message, true);
    }
  });

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

  const excluirAgendamento = async (id) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;
    try {
      await apiFetch(`/agendamentos/${id}`, { method: 'DELETE' });
      showToast('Agendamento excluído!');
      await renderAppointments();
      await renderMasterMetrics();
    } catch (e) {
      showToast(e.message || 'Erro ao excluir agendamento', true);
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
              <div style="display: flex; gap: 6px; align-items: center;">
                <div class="value-badge">${formatCurrency(apt.valor)}</div>
                ${isMaster && status === 'pendente' ? `
                  <button class="button" data-action="concluir" data-id="${apt.id}" style="background:#16a34a; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Concluir</button>
                  <button class="button" data-action="cancelar" data-id="${apt.id}" style="background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Não veio</button>
                ` : ''}
                ${isMaster ? `<button class="button button-danger" data-action="excluir" data-id="${apt.id}" style="background:#64748b; color:white; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">Excluir</button>` : ''}
              </div>
            `;

            row.querySelector('[data-action="concluir"]')?.addEventListener('click', () => alterarStatusAtendimento(apt.id, 'concluir'));
            row.querySelector('[data-action="cancelar"]')?.addEventListener('click', () => alterarStatusAtendimento(apt.id, 'cancelar'));
            row.querySelector('[data-action="excluir"]')?.addEventListener('click', () => excluirAgendamento(apt.id));

            listEl.appendChild(row);
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => setAuthMode(btn.dataset.authMode)));

  navButtons.forEach(btn => btn.addEventListener('click', () => {
    if ((btn.dataset.view === 'cadastros' || btn.dataset.view === 'metricas' || btn.dataset.view === 'clientes') && currentUser?.tipo !== 'master') {
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
        loadRegisteredClients();
        return;
      }
    } catch (e) {}
    authScreen.hidden = false;
    appScreen.hidden = true;
  };

  boot();
});
