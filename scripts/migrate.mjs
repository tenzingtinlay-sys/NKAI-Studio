#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during a configured build or at container startup, applying pending
 * files in ../migrations to DATABASE_URL. When VITE_AUTH_ENABLED is true, the
 * opt-in Better Auth schema under migrations/auth is included too. Each file is
 * applied transactionally and recorded in _migrations, so reruns are safe.
 *
 * No DATABASE_URL (local / image builds) -> skip; the PGLite fallback applies
 * the applicable files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }

  const migrationPaths = entries.filter((entry) => entry.endsWith(".sql"));
  if (process.env.VITE_AUTH_ENABLED !== "false") {
    try {
      const authEntries = await readdir(join(migrationsDir, "auth"));
      const rootNames = new Set(migrationPaths.map((path) => path.split("/").pop()));
      migrationPaths.push(
        ...authEntries
          .filter((entry) => entry.endsWith(".sql") && !rootNames.has(entry))
          .map((entry) => join("auth", entry)),
      );
    } catch {
      // Apps without an opt-in auth migration folder keep their normal schema.
    }
  }

  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(migrationPaths, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name, path } of pendingMigrations(migrationPaths, applied)) {
      const text = await readFile(join(migrationsDir, path), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
