import { getRequest } from "../_libs/@tanstack/react-start+[...].mjs";
import { CompiledQuery, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "../_libs/@better-auth/kysely-adapter+[...].mjs";
import { createAuthMiddleware, importJWK, jwtVerify } from "../_libs/@better-auth/core+[...].mjs";
import { bearer, betterAuth, genericOAuth, getSessionFromCtx, handleOAuthUserInfo, parseSetCookieHeader, setRequestCookie, setSessionCookie, tanstackStartCookies } from "../_libs/better-auth+[...].mjs";
import { Pool } from "../_libs/pg.mjs";
import { randomBytes } from "node:crypto";
//#region src/lib/env.server.ts
function env$1(key) {
	return process.env[key]?.trim() || void 0;
}
/**
* Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
* every publish; the sandbox preview never has it. Single source of truth for
* the split — gate audience, gate endpoints and connector-token semantics all
* key off this predicate.
*/
function isWorkspacePreview() {
	return !env$1("GROK_PROJECT_ID");
}
//#endregion
//#region src/lib/auth/gate-identity.server.ts
var GATE_IDENTITY_HEADER = "x-grok-identity";
var GATE_JWKS_PATH = "/__gate/identity-key";
var JWKS_CACHE_TTL_MS = 3e5;
var PREVIEW_AUDIENCE = "preview";
var PREVIEW_GATE_ORIGIN = "http://127.0.0.1:6014";
var FALLBACK_EMAIL_DOMAIN = "viewer.grok.invalid";
var FALLBACK_NAME = "Grok user";
function gateIdentityEnabled() {
	return env$1("VITE_AUTH_ENABLED") !== "false";
}
function gateTokenAudience() {
	if (isWorkspacePreview()) return PREVIEW_AUDIENCE;
	return `app:${env$1("GROK_PROJECT_ID")}`;
}
async function defaultJwksFetch(url) {
	try {
		const res = await fetch(url, {
			headers: { accept: "application/json" },
			redirect: "manual"
		});
		if (!res.ok) return null;
		const body = await res.json();
		return Array.isArray(body?.keys) ? body : null;
	} catch {
		return null;
	}
}
var jwksCache = /* @__PURE__ */ new Map();
function gateKeyResolver(url, jwksFetch = defaultJwksFetch) {
	return async (protectedHeader) => {
		const kid = typeof protectedHeader.kid === "string" ? protectedHeader.kid : void 0;
		const findKey = (jwks) => jwks.keys.find((k) => k.kty === "OKP" && k.crv === "Ed25519" && (!kid || k.kid === kid));
		let entry = jwksCache.get(url);
		if (!entry || Date.now() - entry.fetchedAt > JWKS_CACHE_TTL_MS) {
			const jwks = await jwksFetch(url);
			if (jwks) {
				entry = {
					jwks,
					fetchedAt: Date.now()
				};
				jwksCache.set(url, entry);
			}
		}
		let key = entry ? findKey(entry.jwks) : void 0;
		if (!key) {
			const jwks = await jwksFetch(url);
			if (jwks) {
				entry = {
					jwks,
					fetchedAt: Date.now()
				};
				jwksCache.set(url, entry);
				key = findKey(jwks);
			}
		}
		if (!key) throw new Error("no gate identity key matches the token kid");
		return importJWK(key, "EdDSA");
	};
}
async function verifyGateIdentityToken(token, options) {
	try {
		const { payload } = await jwtVerify(token, options.getKey, {
			algorithms: ["EdDSA"],
			issuer: options.issuer,
			audience: options.audience,
			requiredClaims: [
				"sub",
				"iat",
				"exp"
			],
			maxTokenAge: "10 minutes"
		});
		const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
		if (!sub) return null;
		return {
			sub,
			email: typeof payload.email === "string" ? payload.email : null,
			name: typeof payload.name === "string" ? payload.name : null,
			teamId: typeof payload.team_id === "string" ? payload.team_id : null
		};
	} catch {
		return null;
	}
}
function resolveGateEndpoints(headers) {
	const explicit = env$1("GROK_GATE_ORIGIN");
	if (explicit) {
		const origin = explicit.replace(/\/+$/, "");
		return {
			issuer: origin,
			jwksUrl: `${origin}${GATE_JWKS_PATH}`
		};
	}
	if (isWorkspacePreview()) return {
		issuer: PREVIEW_GATE_ORIGIN,
		jwksUrl: `${PREVIEW_GATE_ORIGIN}${GATE_JWKS_PATH}`
	};
	const host = (headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host") || "").split(":")[0]?.trim().toLowerCase();
	if (!host) return null;
	let issuer = null;
	if (host === "app-builder-testing.com" || host.endsWith(".app-builder-testing.com")) issuer = "https://gate.app-builder-testing.com";
	else if (host === "grok.me" || host.endsWith(".grok.me")) issuer = "https://gate.grok.me";
	if (!issuer) return null;
	return {
		issuer,
		jwksUrl: `${issuer}${GATE_JWKS_PATH}`
	};
}
function sessionBoundToGateIdentity(accounts, identitySub, gateProviderId) {
	return accounts.some((account) => account.providerId === gateProviderId && account.accountId === identitySub);
}
async function gateIdentityFromHeaders(headers, jwksFetch) {
	if (!gateIdentityEnabled()) return null;
	const token = headers.get(GATE_IDENTITY_HEADER)?.trim();
	if (!token) return null;
	const endpoints = resolveGateEndpoints(headers);
	if (!endpoints) return null;
	return verifyGateIdentityToken(token, {
		issuer: endpoints.issuer,
		audience: gateTokenAudience(),
		getKey: gateKeyResolver(endpoints.jwksUrl, jwksFetch)
	});
}
function gateIdentityUserInfo(identity) {
	return {
		id: identity.sub,
		email: (identity.email ?? `${identity.sub}@${FALLBACK_EMAIL_DOMAIN}`).toLowerCase(),
		emailVerified: Boolean(identity.email),
		name: identity.name ?? FALLBACK_NAME
	};
}
//#endregion
//#region migrations/auth/0001_auth.sql?raw
var _0001_auth_default = "-- Better Auth schema (identity + sessions for \"Sign in with Grok\").\r\n--\r\n-- Generated by the Better Auth CLI for its Postgres adapter — DO NOT EDIT by\r\n-- hand. `@/lib/auth/server` runs Better Auth against these tables when\r\n-- DATABASE_URL is set. The columns are camelCase and MUST stay double-quoted so\r\n-- Postgres preserves the case Better Auth queries by.\r\n--\r\n-- Migrations in this folder are the single source of truth for your schema. They\r\n-- apply to Neon during the Vercel build (`npm run build`) and to the local\r\n-- PGLite fallback automatically on startup, so dev matches production. Applied\r\n-- files are recorded by name in `_migrations` and NEVER run again.\r\n--\r\n-- Put YOUR app's schema in NEW ordered files (0002_*.sql, 0003_*.sql, …), never\r\n-- in this one. For app tables, prefer snake_case and give per-user tables a\r\n-- `user_id TEXT NOT NULL` column (TEXT, not UUID — the preview dev user id is\r\n-- the string 'dev-user'), then scope every query to the authenticated user\r\n-- server-side (see the `neon` + `auth` skills and src/lib/auth/verify.server.ts).\r\n\r\ncreate table if not exists \"user\" (\r\n  \"id\" text not null primary key,\r\n  \"name\" text not null,\r\n  \"email\" text not null unique,\r\n  \"emailVerified\" boolean not null,\r\n  \"image\" text,\r\n  \"createdAt\" timestamptz default CURRENT_TIMESTAMP not null,\r\n  \"updatedAt\" timestamptz default CURRENT_TIMESTAMP not null\r\n);\r\n\r\ncreate table if not exists \"session\" (\r\n  \"id\" text not null primary key,\r\n  \"expiresAt\" timestamptz not null,\r\n  \"token\" text not null unique,\r\n  \"createdAt\" timestamptz default CURRENT_TIMESTAMP not null,\r\n  \"updatedAt\" timestamptz not null,\r\n  \"ipAddress\" text,\r\n  \"userAgent\" text,\r\n  \"userId\" text not null references \"user\" (\"id\") on delete cascade\r\n);\r\n\r\ncreate table if not exists \"account\" (\r\n  \"id\" text not null primary key,\r\n  \"accountId\" text not null,\r\n  \"providerId\" text not null,\r\n  \"userId\" text not null references \"user\" (\"id\") on delete cascade,\r\n  \"accessToken\" text,\r\n  \"refreshToken\" text,\r\n  \"idToken\" text,\r\n  \"accessTokenExpiresAt\" timestamptz,\r\n  \"refreshTokenExpiresAt\" timestamptz,\r\n  \"scope\" text,\r\n  \"password\" text,\r\n  \"createdAt\" timestamptz default CURRENT_TIMESTAMP not null,\r\n  \"updatedAt\" timestamptz not null\r\n);\r\n\r\ncreate table if not exists \"verification\" (\r\n  \"id\" text not null primary key,\r\n  \"identifier\" text not null,\r\n  \"value\" text not null,\r\n  \"expiresAt\" timestamptz not null,\r\n  \"createdAt\" timestamptz default CURRENT_TIMESTAMP not null,\r\n  \"updatedAt\" timestamptz default CURRENT_TIMESTAMP not null\r\n);\r\n\r\ncreate index if not exists \"session_userId_idx\" on \"session\" (\"userId\");\r\ncreate index if not exists \"account_userId_idx\" on \"account\" (\"userId\");\r\ncreate index if not exists \"verification_identifier_idx\" on \"verification\" (\"identifier\");\r\n";
//#endregion
//#region scripts/migration-plan.mjs
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
//#endregion
//#region src/lib/db.ts
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl$1 = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl$1 ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.esm_exports);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl$1 });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.dist_exports);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const rootMigrations = /* #__PURE__ */ Object.assign({});
		const authMigrations = process.env.VITE_AUTH_ENABLED === "false" ? {} : /* #__PURE__ */ Object.assign({ "/migrations/auth/0001_auth.sql": _0001_auth_default });
		const migrations = {
			...rootMigrations,
			...authMigrations
		};
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`; the opt-in auth schema under
* `migrations/auth/*.sql` is also applied when `VITE_AUTH_ENABLED` is not false.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* The shared PGLite instance (preview only), with `migrations/*.sql` applied.
* Lets Better Auth persist to the SAME embedded DB as app data in preview (via a
* Kysely dialect). Throws when `DATABASE_URL` is set (that path uses Neon).
*/
async function getPglite() {
	if (dbSource !== "pglite") throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
	await getSql();
	const pg = await globalRef.__pgliteInstance__;
	if (!pg) throw new Error("PGLite instance failed to initialize");
	return pg;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
//#endregion
//#region src/lib/auth/gate-session-marker.ts
/**
* Client-readable marker for gate-materialized sessions ("Sign in with Grok"
* zero-click sessions minted by `gate-session.server.ts`). Signing out of a
* gate session is a no-op — the next request re-materializes it from
* `x-grok-identity` — so `UserButton` uses this to hide its sign-out control.
* `__Host-` prefixed like the other auth cookies: browsers reject a `__Host-`
* cookie carrying a `Domain`, so an untrusted sibling `*.grok.me` app cannot
* plant a parent-domain copy that the host-only clear could never expire.
* Client-safe: no server imports.
*/
var GATE_SESSION_MARKER_COOKIE = "__Host-grok_gate_session";
function hasGateSessionMarker() {
	if (typeof document === "undefined") return false;
	return document.cookie.split(";").some((pair) => pair.trim().startsWith(`${GATE_SESSION_MARKER_COOKIE}=`));
}
//#endregion
//#region src/lib/auth/gate-session.server.ts
var GATE_PROVIDER_ID = "grok-gate";
var GATE_ACCOUNT_ISSUER = "https://grok.com";
var LOG = "[gate-identity]";
/**
* Emit the signed session cookie so the browser actually receives it.
*
* `setSessionCookie` writes into the Better Auth middleware header bag, but on
* TanStack Start that bag is not always copied onto the final HTTP response
* (the response can end up with no `Set-Cookie`). Sign the token ourselves and
* push it through TanStack's `setCookie` + `responseHeaders` so both the
* framework cookie store and any after-hooks see it.
*/
async function emitSessionCookie(ctx, sessionTokenName, sessionToken) {
	const attributes = ctx.context.authCookies.sessionToken.attributes;
	const maxAge = ctx.context.sessionConfig.expiresIn;
	const cookieOptions = {
		...attributes,
		maxAge
	};
	let signedCookie;
	try {
		signedCookie = await ctx.setSignedCookie(sessionTokenName, sessionToken, ctx.context.secret, cookieOptions);
	} catch (err) {
		console.error(`${LOG} setSignedCookie failed`, err);
		return null;
	}
	const sessionValue = parseSetCookieHeader(signedCookie).get(sessionTokenName)?.value;
	if (!sessionValue) {
		console.error(`${LOG} signed Set-Cookie missing session token value`, { cookiePreview: signedCookie.slice(0, 120) });
		return null;
	}
	try {
		const { setCookie } = await import("../_libs/@tanstack/react-start+[...].mjs").then((n) => n.server_exports);
		setCookie(sessionTokenName, sessionValue, {
			path: cookieOptions.path ?? "/",
			httpOnly: cookieOptions.httpOnly ?? true,
			secure: cookieOptions.secure ?? true,
			sameSite: cookieOptions.sameSite ?? "lax",
			maxAge: typeof maxAge === "number" ? maxAge : void 0,
			domain: cookieOptions.domain
		});
	} catch (err) {
		console.error(`${LOG} TanStack setCookie failed`, err);
	}
	try {
		const responseHeaders = ctx.context.responseHeaders;
		if (responseHeaders) responseHeaders.append("set-cookie", signedCookie);
		else console.error(`${LOG} ctx.context.responseHeaders is missing`);
	} catch (err) {
		console.error(`${LOG} responseHeaders.append(set-cookie) failed`, err);
	}
	return sessionValue;
}
/**
* Expire the previous user's `session_data` cookie cache after an identity
* swap. The cache is signed against the old session and outlives it (5-min
* TTL), so without this `/get-session` keeps serving the replaced user.
* Mirrors `emitSessionCookie`'s dual-path delivery: TanStack's response
* cookie store plus Better Auth's `responseHeaders` bag.
*/
async function expireSessionDataCookie(ctx, cookie) {
	const path = cookie.attributes.path ?? "/";
	const secure = cookie.attributes.secure ?? true;
	try {
		const { setCookie } = await import("../_libs/@tanstack/react-start+[...].mjs").then((n) => n.server_exports);
		setCookie(cookie.name, "", {
			path,
			httpOnly: true,
			secure,
			sameSite: "lax",
			maxAge: 0
		});
	} catch (err) {
		console.error(`${LOG} TanStack setCookie (expire session_data) failed`, err);
	}
	try {
		ctx.context.responseHeaders?.append("set-cookie", `${cookie.name}=; Path=${path}; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=0`);
	} catch (err) {
		console.error(`${LOG} responseHeaders.append (expire session_data) failed`, err);
	}
}
/**
* Write or clear the client-readable gate-session marker
* (`gate-session-marker.ts`), through the same dual-path delivery as
* `emitSessionCookie`. Not HttpOnly by design: `UserButton` reads it to hide
* sign-out for gate sessions (signing out would re-materialize instantly).
*/
async function writeGateMarkerCookie(ctx, clear) {
	const sessionMaxAge = ctx.context.sessionConfig.expiresIn;
	const maxAge = clear ? 0 : typeof sessionMaxAge === "number" ? sessionMaxAge : void 0;
	const value = clear ? "" : "1";
	try {
		const { setCookie } = await import("../_libs/@tanstack/react-start+[...].mjs").then((n) => n.server_exports);
		setCookie(GATE_SESSION_MARKER_COOKIE, value, {
			path: "/",
			httpOnly: false,
			secure: true,
			sameSite: "lax",
			maxAge
		});
	} catch (err) {
		console.error(`${LOG} TanStack setCookie (gate marker) failed`, err);
	}
	try {
		ctx.context.responseHeaders?.append("set-cookie", `${GATE_SESSION_MARKER_COOKIE}=${value}; Path=/; Secure; SameSite=Lax` + (maxAge === void 0 ? "" : `; Max-Age=${maxAge}`));
	} catch (err) {
		console.error(`${LOG} responseHeaders.append (gate marker) failed`, err);
	}
}
/**
* Clear a stale marker when a `/get-session` arrives without `x-grok-identity`:
* the browser is no longer behind a gate viewer (returned anonymously, or the
* session is a broker one), so sign-out must not stay hidden. Emits the
* Max-Age=0 clear only when the marker is actually on the request.
*/
async function clearGateMarkerIfPresent(ctx, inbound) {
	if (!(inbound.get("cookie") ?? "").includes(`__Host-grok_gate_session=`)) return;
	await writeGateMarkerCookie(ctx, true);
}
/** Drop a cookie from the request `Cookie` header (inverse of `setRequestCookie`). */
function removeRequestCookie(headers, name) {
	const cookieHeader = headers.get("cookie");
	if (!cookieHeader) return;
	const kept = cookieHeader.split(";").map((pair) => pair.trim()).filter((pair) => pair && !pair.startsWith(`${name}=`));
	if (kept.length > 0) headers.set("cookie", kept.join("; "));
	else headers.delete("cookie");
}
function gateIdentitySessions() {
	return {
		id: "grok-gate-identity",
		hooks: { before: [{
			matcher: (ctx) => ctx.path === "/get-session",
			handler: createAuthMiddleware(async (ctx) => {
				if (!gateIdentityEnabled()) return;
				const inbound = ctx.request?.headers ?? ctx.headers;
				if (!inbound) {
					console.error(`${LOG} no request headers on /get-session`);
					return;
				}
				if (inbound.get("authorization")) return;
				if (!inbound.get("x-grok-identity")) {
					await clearGateMarkerIfPresent(ctx, inbound);
					return;
				}
				const identity = await gateIdentityFromHeaders(inbound);
				if (!identity) {
					console.error(`${LOG} ${GATE_IDENTITY_HEADER} present but verification failed`);
					return;
				}
				const sessionCookieName = ctx.context.authCookies.sessionToken.name;
				if ((inbound.get("cookie") ?? "").includes(`${sessionCookieName}=`)) {
					const existing = await getSessionFromCtx(ctx).catch((err) => {
						console.error(`${LOG} getSessionFromCtx failed`, err);
						return null;
					});
					if (existing?.session && existing.user) {
						const accounts = await ctx.context.internalAdapter.findAccounts(existing.user.id).catch((err) => {
							console.error(`${LOG} findAccounts failed`, err);
							return null;
						});
						if (!accounts) {
							console.error(`${LOG} could not load accounts for existing session user`, { userId: existing.user.id });
							return;
						}
						if (sessionBoundToGateIdentity(accounts, identity.sub, "grok-gate")) {
							await writeGateMarkerCookie(ctx, false);
							return;
						}
						await ctx.context.internalAdapter.deleteSession(existing.session.token).catch((err) => {
							console.error(`${LOG} deleteSession (stale non-gate session) failed`, err);
							return null;
						});
					}
				}
				try {
					const result = await handleOAuthUserInfo(ctx, {
						userInfo: gateIdentityUserInfo(identity),
						account: {
							providerId: GATE_PROVIDER_ID,
							issuer: GATE_ACCOUNT_ISSUER,
							accountId: identity.sub
						}
					});
					if (result.error || !result.data) {
						console.error(`${LOG} handleOAuthUserInfo failed`, {
							error: result.error,
							hasData: Boolean(result.data),
							sub: identity.sub
						});
						return;
					}
					await setSessionCookie(ctx, result.data);
					const sessionValue = await emitSessionCookie(ctx, sessionCookieName, result.data.session.token);
					if (!sessionValue) {
						console.error(`${LOG} session created in DB but cookie was not emitted`, { userId: result.data.user.id });
						return;
					}
					await writeGateMarkerCookie(ctx, false);
					const sessionDataCookie = ctx.context.authCookies.sessionData;
					await expireSessionDataCookie(ctx, sessionDataCookie);
					const headers = new Headers(Object.fromEntries(inbound.entries()));
					setRequestCookie(headers, sessionCookieName, sessionValue);
					removeRequestCookie(headers, sessionDataCookie.name);
					return { context: { headers } };
				} catch (err) {
					console.error(`${LOG} gate identity session hook threw`, err);
					return;
				}
			})
		}] }
	};
}
//#endregion
//#region src/lib/auth/providers.ts
var GROK_PROVIDERS = [{
	providerId: "grok-google",
	idp: "google",
	label: "Google"
}, {
	providerId: "grok-x",
	idp: "twitter",
	label: "X"
}];
//#endregion
//#region src/lib/auth/pglite-dialect.ts
/** Factory used by `auth/server.ts`: `pgliteDialect(() => getPglite())`. */
function pgliteDialect(getClient) {
	return {
		createAdapter: () => new PostgresAdapter(),
		createDriver: () => new LazyPGliteDriver(getClient),
		createQueryCompiler: () => new PostgresQueryCompiler(),
		createIntrospector: (db) => new PostgresIntrospector(db)
	};
}
var LazyPGliteDriver = class {
	getClient;
	client;
	connection;
	queue = [];
	constructor(getClient) {
		this.getClient = getClient;
	}
	async init() {
		this.client = await this.getClient();
	}
	async acquireConnection() {
		if (this.client === void 0) this.client = await this.getClient();
		if (this.connection !== void 0) return new Promise((resolve) => {
			this.queue.push(resolve);
		});
		this.connection = new PGliteConnection(this.client);
		return this.connection;
	}
	async releaseConnection(connection) {
		if (connection !== this.connection) throw new Error("Invalid connection");
		const next = this.queue.shift();
		if (next === void 0) {
			this.connection = void 0;
			return;
		}
		next(this.connection);
	}
	async beginTransaction(conn, settings) {
		const c = conn;
		if (settings.isolationLevel) await c.executeQuery(CompiledQuery.raw(`start transaction isolation level ${settings.isolationLevel}`));
		else await c.executeQuery(CompiledQuery.raw("begin"));
	}
	async commitTransaction(conn) {
		await conn.executeQuery(CompiledQuery.raw("commit"));
	}
	async rollbackTransaction(conn) {
		await conn.executeQuery(CompiledQuery.raw("rollback"));
	}
	async destroy() {
		this.client = void 0;
		this.connection = void 0;
		this.queue = [];
	}
};
var PGliteConnection = class {
	client;
	constructor(client) {
		this.client = client;
	}
	async executeQuery(compiledQuery) {
		const result = await this.client.query(compiledQuery.sql, [...compiledQuery.parameters]);
		if (result.affectedRows) return {
			numAffectedRows: BigInt(result.affectedRows),
			rows: result.rows
		};
		return { rows: result.rows };
	}
	async *streamQuery(compiledQuery, chunkSize) {
		if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error("chunkSize must be a positive integer");
		const result = await this.client.query(compiledQuery.sql, [...compiledQuery.parameters]);
		for (let i = 0; i < result.rows.length; i += chunkSize) yield { rows: result.rows.slice(i, i + chunkSize) };
	}
};
//#endregion
//#region src/lib/auth/server.ts
/**
* Self-hosted Better Auth for THIS app (server-only).
*
* Pre-wired for live preview + deploy — do not rewrite this file. To enable
* local email/password, flip the flag in `./email-password` only (see auth skill).
*
* The app runs its own Better Auth at `/api/auth/*`, so the session cookie stays
* on this app's own origin. Sign-in federates to the shared **Grok auth broker**
* (`GROK_AUTH_ISSUER`) via the `genericOAuth` plugin — the broker brokers the
* upstream sign-in methods (Google, X, …) and holds their shared secrets; this
* app only holds its own client id/secret and names the upstream it wants via
* each provider's `idp` hint.
*
* Tri-mode:
*   - Deployed: the deployer injects a per-app `GROK_AUTH_*` + `BETTER_AUTH_URL`
*     + `DATABASE_URL`, so real federated auth is persisted in Postgres.
*   - Sandbox live preview: no injection -> falls back to the shared **preview
*     client** (`./preview`) and derives the preview's `https://*.grok-sandbox.com`
*     origin from the request, so real sign-in works (no demo users). Sessions
*     and identities persist in the embedded PGLite DB (same DB as app data);
*     the process restart wipes both. Live-preview iframe clients use a bearer
*     token (partitioned cookies) — see `client.ts`.
*   - Off (`VITE_AUTH_ENABLED=false`, the shipped default): no providers;
*     `requireUserId` resolves a dev user with no database configured, and
*     throws fail-closed once `DATABASE_URL` is set (see `verify.server.ts`).
*
* NEVER import this from client code — it pulls in `pg` + the preview secret +
* server-only Better Auth internals. The client uses `@/lib/auth/client`;
* components read the user via `@/lib/auth/use-current-user`; server functions get
* a verified id via `@/lib/auth/middleware`.
*/
ensureDbReady();
/**
* Preview secret must outlive module reloads: PGLite (and its session rows) is
* stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
* signing secret or every existing session becomes invalid mid-dev. Process
* restart clears both the secret and PGLite together.
*/
var globalAuthRef = globalThis;
function previewAuthSecret() {
	globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
	return globalAuthRef.__grokAuthPreviewSecret__;
}
/** Read an env var, treating empty/whitespace as unset. */
var env = (key) => {
	const value = process.env[key]?.trim();
	return value ? value : void 0;
};
var authDisabled = env("VITE_AUTH_ENABLED") === "false";
var googleClientId = env("GOOGLE_CLIENT_ID");
var googleClientSecret = env("GOOGLE_CLIENT_SECRET");
Boolean(env("BETTER_AUTH_URL"));
var grokIssuer = env("GROK_AUTH_ISSUER");
var grokClientId = env("GROK_AUTH_CLIENT_ID");
var grokClientSecret = env("GROK_AUTH_CLIENT_SECRET");
/** True when at least one real sign-in provider is configured. */
var authConfigured = !authDisabled && (Boolean(googleClientId && googleClientSecret) || Boolean(grokIssuer && grokClientId && grokClientSecret));
var explicitBaseURL = env("BETTER_AUTH_URL");
var LOCAL_DEV_ORIGINS = [
	"http://localhost:8080",
	"http://127.0.0.1:8080",
	"http://[::1]:8080"
];
var baseURL = explicitBaseURL ?? {
	allowedHosts: [...LOCAL_DEV_ORIGINS.map((u) => new URL(u).host)],
	protocol: "auto",
	fallback: "http://localhost:8080"
};
var trustedOrigins = explicitBaseURL ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS] : [...LOCAL_DEV_ORIGINS];
var databaseUrl = env("DATABASE_URL");
var issuerBase = grokIssuer?.replace(/\/+$/, "");
var grokAuthorizationUrl = issuerBase ? `${issuerBase}/api/auth/oauth2/authorize` : "";
var grokTokenUrl = issuerBase ? `${issuerBase}/api/auth/oauth2/token` : "";
var grokUserInfoUrl = issuerBase ? `${issuerBase}/api/auth/oauth2/userinfo` : "";
var database = databaseUrl ? new Pool({ connectionString: databaseUrl }) : {
	dialect: pgliteDialect(() => getPglite()),
	type: "postgres"
};
/** Session token cookie name — also read by the live-preview popup completion page. */
var SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";
var grokOAuthPlugin = !authDisabled && grokIssuer && grokClientId && grokClientSecret ? genericOAuth({ config: GROK_PROVIDERS.map(({ providerId, idp }) => ({
	providerId,
	clientId: grokClientId,
	clientSecret: grokClientSecret,
	authorizationUrl: grokAuthorizationUrl,
	tokenUrl: grokTokenUrl,
	userInfoUrl: grokUserInfoUrl,
	scopes: [
		"openid",
		"profile",
		"email"
	],
	authorizationUrlParams: {
		idp,
		prompt: "login"
	}
})) }) : null;
var auth = betterAuth({
	baseURL,
	...googleClientId && googleClientSecret ? { socialProviders: { google: {
		clientId: googleClientId,
		clientSecret: googleClientSecret
	} } } : {},
	secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
	database,
	trustedOrigins,
	account: {
		encryptOAuthTokens: true,
		accountLinking: {
			enabled: true,
			trustedProviders: [
				...GROK_PROVIDERS.map((p) => p.providerId),
				...googleClientId && googleClientSecret ? ["google"] : [],
				GATE_PROVIDER_ID
			],
			requireLocalEmailVerified: false
		}
	},
	session: { cookieCache: {
		enabled: true,
		maxAge: 300
	} },
	advanced: {
		useSecureCookies: false,
		defaultCookieAttributes: {
			secure: true,
			sameSite: "lax",
			path: "/"
		},
		cookies: {
			session_token: { name: SESSION_TOKEN_COOKIE },
			session_data: { name: "__Host-grok-auth.session_data" },
			account_data: { name: "__Host-grok-auth.account_data" },
			dont_remember: { name: "__Host-grok-auth.dont_remember" }
		}
	},
	plugins: [
		gateIdentitySessions(),
		...grokOAuthPlugin ? [grokOAuthPlugin] : [],
		bearer(),
		tanstackStartCookies()
	]
});
if (Boolean(process.env.DATABASE_URL?.trim()) && !authConfigured) console.error("[auth] DATABASE_URL is set but auth is disabled (VITE_AUTH_ENABLED=false) — requireUserId() will reject every request (fail closed) rather than share one dev user on a real database.");
/**
* Resolve the signed-in user from the current request, or `null` when auth isn't
* configured / nobody is signed in. Safe to call from server functions and SSR
* loaders.
*
* `bearerToken` is for the LIVE PREVIEW: the app runs in a partitioned iframe
* whose cookies don't reach the server, so `authMiddleware` forwards the session
* as a bearer token, which we present as `Authorization: Bearer …` (the `bearer`
* plugin resolves it). When deployed no token is passed and the cookie is used.
*/
async function getSessionUser(bearerToken) {
	if (!authConfigured && !gateIdentityEnabled()) return null;
	const request = getRequest();
	if (!request) return null;
	let headers = request.headers;
	if (bearerToken) {
		headers = new Headers(request.headers);
		headers.set("Authorization", `Bearer ${bearerToken}`);
	}
	const session = await auth.api.getSession({ headers });
	if (!session?.user) return null;
	return {
		id: session.user.id,
		email: session.user.email ?? null
	};
}
//#endregion
export { GROK_PROVIDERS, auth, getSessionUser, hasGateSessionMarker };
