const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Database Host:', process.env.DB_HOST);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Enhanced connection test with better logging
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error acquiring client:', err.message);
    console.error('❌ Error details:', err);
    return;
  }
  
  console.log('✅ Connected to PostgreSQL database');
  client.query('SELECT NOW(), version(), current_database()', (err, result) => {
    release();
    if (err) {
      console.error('❌ Error executing query:', err.stack);
      return;
    }
    console.log('⏰ Database time:', result.rows[0].now);
    console.log('🗄️ Database name:', result.rows[0].current_database);
    console.log('🐘 PostgreSQL version:', result.rows[0].version.split(',')[0]);
  });
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

module.exports = pool;