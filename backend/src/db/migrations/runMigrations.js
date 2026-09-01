const fs = require('fs');
const path = require('path');
const pool = require('../pool');

async function runMigrations() {
  console.log('Running database migrations...');
  const schemaPath = path.join(__dirname, '001_initial_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runMigrations;
