const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) DEFAULT 'cliente'
      );

      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(64) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        valor NUMERIC,
        duracao_minutos INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(64) PRIMARY KEY,
        servico_id VARCHAR(64),
        servico_nome VARCHAR(150),
        valor NUMERIC,
        usuario_id VARCHAR(64),
        usuario_nome VARCHAR(150),
        data_hora VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pendente'
      );
    `);

    // E-MAIL ATUALIZADO PARA @gmail.com
    const masterEmail = 'prodrigosilvacel@gmail.com';
    const checkMaster = await pool.query('SELECT id FROM users WHERE email = $1', [masterEmail]);
    if (checkMaster.rows.length === 0) {
      const passwordHash = await bcrypt.hash('w18187', 10);
      await pool.query(
        'INSERT INTO users (id, nome, email, senha, tipo) VALUES ($1, $2, $3, $4, $5)',
        ['master-1', 'Studio Master', masterEmail, passwordHash, 'master']
      );
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
};
