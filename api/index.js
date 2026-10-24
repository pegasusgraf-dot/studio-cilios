const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.end();
    }

    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (req.method === 'GET' && pathname === '/api/health') {
      const result = await pool.query('SELECT 1 as ok, NOW() as now');
      return res.status(200).json({ ok: true, now: result.rows[0].now });
    }

    return res.status(404).json({ mensagem: 'Rota não encontrada.' });
  } catch (error) {
    console.error('DB ERROR:', error);
    return res.status(500).json({
      mensagem: 'Erro ao conectar com o banco',
      error: error.message,
    });
  }
};
