#!/usr/bin/env node
const { Client } = require('pg');
const { randomBytes } = require('crypto');
(async () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error(JSON.stringify({ ok: false, error: 'DATABASE_URL not set' }));
      process.exit(2);
    }
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    const uid = 'user-' + randomBytes(8).toString('hex');
    const sid = 'sess-' + randomBytes(8).toString('hex');
    const token = randomBytes(16).toString('hex');

    await client.query(
      'INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,now(),now()) ON CONFLICT ("id") DO NOTHING',
      [uid, 'Test User', 'tenzingtinlay@gmail.com', true],
    );

    await client.query(
      'INSERT INTO "session" ("id","expiresAt","token","createdAt","updatedAt","ipAddress","userAgent","userId") VALUES ($1, now() + interval \'7 days\', $2, now(), now(), $3, $4, $5) ON CONFLICT ("id") DO NOTHING',
      [sid, token, '127.0.0.1', 'smoke', uid],
    );

    await client.end();
    console.log(JSON.stringify({ ok: true, userId: uid, sessionId: sid, token }));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
    process.exit(1);
  }
})();
