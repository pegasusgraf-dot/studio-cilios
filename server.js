app.get('/api/usuarios/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();

  try {
    const user = await get('SELECT id, nome, email, tipo FROM usuarios WHERE id = ?', [id]);

    if (!user) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    res.json({
      id: user.id,
      nome: user.nome,
      cargo: user.tipo === 'master' ? 'Master' : 'Cliente',
      fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro ao buscar usuário.' });
  }
});
