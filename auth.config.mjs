import { Pool } from 'pg';

// Use DATABASE_URL from the environment. In preview mode this may be unset,
// in which case migrations will operate against an in-memory/default sqlite
// introspection (the CLI logs a warning). The CLI expects a config file that
// exports defaults the tooling can use.
export const auth = {
  // When DATABASE_URL is set, provide a postgres Pool so the adapter uses it.
  database: process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined,
  // Where the Better Auth migrations live in this repo.
  migrationsDir: './migrations/auth',
  // Helpful logger level for the migrate tool.
  logger: { level: 'info' },
};

export default auth;

