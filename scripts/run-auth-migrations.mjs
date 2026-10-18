import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

const migrationsDir = join(process.cwd(), 'migrations', 'auth');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in the environment. Aborting.');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const client = await pool.connect();
  try {
    for (const file of files) {
      const path = join(migrationsDir, file);
      const sql = readFileSync(path, 'utf8');
      console.log('Applying', file);
      // Split on semicolon at line ends conservatively — the file appears safe.
      await client.query(sql);
      console.log('Applied', file);
    }
    console.log('All auth migrations applied');
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
