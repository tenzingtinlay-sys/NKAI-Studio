const { Pool } = require('pg');
const { betterAuth } = require('better-auth');

const database = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;

const auth = betterAuth({
  // minimal options to let the CLI introspect and run migrations
  database,
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret',
  migrationsDir: './migrations/auth',
  logger: { level: 'info' },
});

module.exports = { auth };
