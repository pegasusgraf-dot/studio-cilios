document.addEventListener('DOMContentLoaded', () => {
  const apiBase = '/api';

  const setStatus = (id, message, isError = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('error');
    if (isError) el.classList.add('error');
  };

  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (error) {
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.mensagem || data.error || 'Erro na requisição');
    }

    return data;
  };

  const renderServices = async () => {
    const listEl = document.getElementById('servicosList');
    const selectEl = document.getElementById('agendamentoServico');

    try {
      const servicos = await apiFetch('/servicos');

      if (selectEl) {
        selectEl.innerHTML = '<option value="">Selecione um serviço</option>';
        servicos.forEach((servico) => {
          const option = document.createElement('option');
          option.value = servico.id;
          option.textContent = `${servico.nome} — R$ ${Number(servico.valor).toFixed(2)}`;
          selectEl.appendChild(option);
        });
      }

      if (listEl) {
        listEl.innerHTML = '';

        if (!servicos.length) {
          listEl.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
          return;
        }

        servicos.forEach((servico) => {
          const row = document.createElement('div');
          row.style.border = '1px solid #eee';
          row.style.borderRadius = '10px';
          row.style.padding = '10px';
          row.style.marginTop = '10px';
          row.innerHTML = `
            <strong>${servico.nome}</strong><br>
            <span>Valor: R$ ${Number(servico.valor).toFixed(2)}</span><br>
            <span>Duração: ${servico.duracao_minutos} min</span>
          `;
          listEl.appendChild(row);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      if (listEl) listEl.innerHTML = '<p>Não foi possível carregar os serviços.</p>';
    }
  };

  const renderAppointments = async () => {
    const listEl = document.getElementById('agendamentosList');

    try {
      const agendamentos = await apiFetch('/agendamentos');

      if (!listEl) return;
      listEl.innerHTML = '';

      if (!agendamentos.length) {
        listEl.innerHTML = '<p>Nenhum agendamento cadastrado.</p>';
        return;
      }

      agendamentos.forEach((agendamento) => {
        const row = document.createElement('div');
        row.style.border = '1px solid #eee';
        row.style.borderRadius = '10px';
        row.style.padding = '10px';
        row.style.marginTop = '10px';
        row.innerHTML = `
          <strong>${agendamento.servico_nome || 'Procedimento'}</strong><br>
          <span>Data: ${new Date(agendamento.data_hora).toLocaleString('pt-BR')}</span><br>
          <span>Valor: R$ ${Number(agendamento.valor || 0).toFixed(2)}</span>
        `;
        listEl.appendChild(row);
      });
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      if (listEl) listEl.innerHTML = '<p>Não foi possível carregar os agendamentos.</p>';
    }
  };

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const email = String(formData.get('email') || '').trim();
      const senha = String(formData.get('senha') || '').trim();

      try {
        const result = await apiFetch('/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        });

        setStatus('loginStatus', `Login realizado com sucesso! Bem-vindo(a), ${result.usuario?.nome || 'usuário'}.`);
        loginForm.reset();
      } catch (error) {
        setStatus('loginStatus', error.message || 'Erro ao fazer login.', true);
      }
    });
  }

  const cadastroForm = document.getElementById('cadastroForm');
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(cadastroForm);
      const nome = String(formData.get('nome') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const senha = String(formData.get('senha') || '').trim();

      try {
        await apiFetch('/cadastro', {
          method: 'POST',
          body: JSON.stringify({ nome, email, senha }),
        });

        setStatus('cadastroStatus', 'Cadastro realizado com sucesso! Agora faça login.', false);
        cadastroForm.reset();
      } catch (error) {
        setStatus('cadastroStatus', error.message || 'Erro ao cadastrar.', true);
      }
    });
  }

  const servicoForm = document.getElementById('servicoForm');
  if (servicoForm) {
    servicoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(servicoForm);
      const nome = String(formData.get('nome') || '').trim();
      const valor = Number(formData.get('valor') || 0);
      const duracao_minutos = Number(formData.get('duracao_minutos') || 0);

      try {
        await apiFetch('/servicos', {
          method: 'POST',
          body: JSON.stringify({ nome, valor, duracao_minutos }),
        });

        setStatus('servicoStatus', 'Serviço salvo com sucesso!', false);
        servicoForm.reset();
        await renderServices();
      } catch (error) {
        setStatus('servicoStatus', error.message || 'Erro ao salvar serviço.', true);
      }
    });
  }

  const agendamentoForm = document.getElementById('agendamentoForm');
  if (agendamentoForm) {
    agendamentoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(agendamentoForm);
      const servico_id = formData.get('servico') || '';
      const data_hora = String(formData.get('data_hora') || '').trim();

      if (!servico_id || !data_hora) {
        setStatus('agendamentoStatus', 'Selecione um serviço e informe a data/hora.', true);
        return;
      }

      try {
        await apiFetch('/agendamentos', {
          method: 'POST',
          body: JSON.stringify({ servico_id, data_hora, usuario_id: null }),
        });

        setStatus('agendamentoStatus', 'Agendamento criado com sucesso!', false);
        agendamentoForm.reset();
        await renderAppointments();
      } catch (error) {
        setStatus('agendamentoStatus', error.message || 'Erro ao criar agendamento.', true);
      }
    });
  }

  renderServices();
  renderAppointments();
});
