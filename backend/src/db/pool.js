const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'wtflivepulse',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'wtfuser',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'wtfpassword',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
