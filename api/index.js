const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testDatabase() {
  try {
    const result = await pool.query('SELECT 1 as ok, NOW() as now');
    console.log('Banco OK:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Erro ao conectar no banco:', error.message);
    return false;
  }
}
