// Simplified serverless API to be used by Vercel; this file uses Supabase server-side keys via env vars
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem ser definidos no ambiente do Vercel.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const makeId = () => `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const normalizeUser = (usuario) => ({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo || 'cliente' });
const normalizeService = (servico) => ({ id: servico.id, nome: servico.nome, valor: Number(servico.valor || 0), duracao_minutos: Number(servico.duracao_minutos || 0) });
const normalizeAppointment = (agendamento) => ({ id: agendamento.id, servico_id: agendamento.servico_id, servico_nome: agendamento.servico_nome || agendamento.services?.nome || 'Procedimento', valor: Number(agendamento.valor || agendamento.services?.valor || 0), usuario_id: agendamento.usuario_id, usuario_nome: agendamento.usuario_nome || agendamento.users?.nome || 'Cliente', data_hora: agendamento.data_hora });

const getTable = async (tableName, filters = []) => {
  let query = supabase.from(tableName).select('*');
  for (const [field, value] of filters) query = query.eq(field, value);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

app.get('/api/health', (req, res) => res.json({ ok: true, message: 'Supabase backend ok.' }));

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const usuarios = await getTable('users', [['email', normalizedEmail]]);
    const usuario = usuarios.find((item) => item.senha === String(senha));
    if (!usuario) return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    return res.json({ usuario: normalizeUser(usuario) });
  } catch (error) {
    console.error('Erro em /api/login:', error);
    return res.status(500).json({ mensagem: 'Não foi possível fazer login.' });
  }
});

app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body || {};
    if (!nome || !email || !senha) return res.status(400).json({ mensagem: 'Nome, e-mail e senha são obrigatórios.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const usuariosExistentes = await getTable('users', [['email', normalizedEmail]]);
    if (usuariosExistentes.length > 0) return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado.' });
    const novoUsuario = { id: makeId(), nome: String(nome).trim(), email: normalizedEmail, senha: String(senha), tipo: 'cliente' };
    const { data, error } = await supabase.from('users').insert([novoUsuario]).select().single();
    if (error) throw error;
    return res.status(201).json({ mensagem: 'Cadastrado com sucesso!', usuario: normalizeUser(data) });
  } catch (error) {
    console.error('Erro em /api/cadastro:', error);
    return res.status(500).json({ mensagem: 'Não foi possível concluir o cadastro.' });
  }
});

app.get('/api/servicos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return res.json((data || []).map(normalizeService));
  } catch (error) {
    console.error('Erro em /api/servicos:', error);
    return res.status(500).json({ mensagem: 'Não foi possível carregar os serviços.' });
  }
});

app.post('/api/servicos', async (req, res) => {
  try {
    const { nome, valor, duracao_minutos } = req.body || {};
    if (!nome || valor === undefined || duracao_minutos === undefined) return res.status(400).json({ mensagem: 'Nome, valor e duração são obrigatórios.' });
    const novoServico = { id: makeId(), nome: String(nome).trim(), valor: Number(valor), duracao_minutos: Number(duracao_minutos) };
    const { data, error } = await supabase.from('services').insert([novoServico]).select().single();
    if (error) throw error;
    return res.status(201).json(normalizeService(data));
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    return res.status(500).json({ mensagem: 'Não foi possível cadastrar o serviço.' });
  }
});

app.delete('/api/servicos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('services').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar serviço:', error);
    return res.status(500).json({ mensagem: 'Não foi possível excluir o serviço.' });
  }
});

app.get('/api/agendamentos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('appointments').select('*').order('data_hora', { ascending: true });
    if (error) throw error;
    const serviceIds = [...new Set((data || []).map((item) => item.servico_id).filter(Boolean))];
    const userIds = [...new Set((data || []).map((item) => item.usuario_id).filter(Boolean))];
    const [servicosResult, usuariosResult] = await Promise.all([
      serviceIds.length ? supabase.from('services').select('*').in('id', serviceIds) : Promise.resolve({ data: [] }),
      userIds.length ? supabase.from('users').select('*').in('id', userIds) : Promise.resolve({ data: [] }),
    ]);
    const servicosMap = new Map((servicosResult.data || []).map((item) => [item.id, item]));
    const usuariosMap = new Map((usuariosResult.data || []).map((item) => [item.id, item]));
    const result = (data || []).map((agendamento) => {
      const servico = servicosMap.get(agendamento.servico_id) || {};
      const usuario = usuariosMap.get(agendamento.usuario_id) || {};
      return normalizeAppointment({ ...agendamento, servico_nome: servico.nome || agendamento.servico_nome || 'Procedimento', valor: agendamento.valor ?? servico.valor ?? 0, usuario_nome: usuario.nome || agendamento.usuario_nome || 'Cliente' });
    });
    return res.json(result);
  } catch (error) {
    console.error('Erro em /api/agendamentos:', error);
    return res.status(500).json({ mensagem: 'Não foi possível carregar os agendamentos.' });
  }
});

app.post('/api/agendamentos', async (req, res) => {
  try {
    const { servico_id, data_hora, usuario_id } = req.body || {};
    if (!servico_id || !data_hora) return res.status(400).json({ mensagem: 'Serviço e data/hora são obrigatórios.' });
    const { data: servicoData, error: servicoError } = await supabase.from('services').select('*').eq('id', String(servico_id)).maybeSingle();
    if (servicoError) throw servicoError;
    if (!servicoData) return res.status(400).json({ mensagem: 'Serviço inválido.' });
    const resolvedUsuarioId = usuario_id || 'cliente-default';
    const { data: usuarioData } = await supabase.from('users').select('*').eq('id', String(resolvedUsuarioId)).maybeSingle();
    const novoAgendamento = { id: makeId(), servico_id: String(servico_id), servico_nome: servicoData.nome, valor: Number(servicoData.valor || 0), usuario_id: resolvedUsuarioId, usuario_nome: usuarioData?.nome || 'Cliente', data_hora: new Date(data_hora).toISOString() };
    const { data, error } = await supabase.from('appointments').insert([novoAgendamento]).select().single();
    if (error) throw error;
    return res.status(201).json(normalizeAppointment(data));
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ mensagem: 'Não foi possível criar o agendamento.' });
  }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('appointments').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return res.status(500).json({ mensagem: 'Não foi possível cancelar o agendamento.' });
  }
});

module.exports = app;
