require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mediconsult',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
};

let pool;

function prepare(sql) {
  return {
    async get(...params) {
      const [rows] = await pool.execute(sql, params);
      return rows[0];
    },
    async all(...params) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
    async run(...params) {
      const [result] = await pool.execute(sql, params);
      return {
        lastInsertRowid: result.insertId,
        changes: result.affectedRows
      };
    }
  };
}

function loadTableSchema() {
  const schemaPath = path.join(__dirname, '..', 'database', 'mediconsult.sql');
  return fs.readFileSync(schemaPath, 'utf8')
    // Shared hosting users usually cannot CREATE DATABASE — DB is made in cPanel
    .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
    .replace(/USE\s+`?[\w]+`?\s*;/gi, '')
    .trim();
}

async function initDatabase() {
  // Try to ensure DB exists when the account has privilege (local/VPS)
  try {
    const bootstrap = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await bootstrap.end();
  } catch (err) {
    console.warn('Skipping CREATE DATABASE (normal on Namecheap shared hosting):', err.message);
  }

  pool = mysql.createPool({
    ...config,
    multipleStatements: true
  });

  const tablesSql = loadTableSchema();
  const conn = await pool.getConnection();
  try {
    await conn.query(`USE \`${config.database}\``);
    if (tablesSql) await conn.query(tablesSql);
  } finally {
    conn.release();
  }

  const [rows] = await pool.query('SELECT DATABASE() AS db');
  console.log(`MySQL connected → ${config.host}:${config.port}/${rows[0].db}`);
}

module.exports = {
  prepare,
  initDatabase,
  getPool: () => pool
};
