import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { dockerComposeInvocation } from "./docker-compose-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infra", "miniapp", "docker-compose.yml");
const defaultAdminUrl = "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp";
const defaultRedisUrl = "redis://127.0.0.1:56379";

function localUrl(value, protocols, code) {
  let url;
  try { url = new URL(value); } catch { throw new Error(code); }
  if (!protocols.includes(url.protocol) || !["127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.port || Number(url.port) < 1 || url.search || url.hash) throw new Error(code);
  return url;
}

export function readInfrastructureRuntime(env = process.env) {
  const mode = env.MINIAPP_INFRA_MODE ?? "compose";
  if (mode === "compose") {
    if (env.MINIAPP_ADMIN_DATABASE_URL && env.MINIAPP_ADMIN_DATABASE_URL !== defaultAdminUrl)
      throw new Error("compose_admin_database_url_mismatch");
    if (env.MINIAPP_INFRA_REDIS_URL || env.MINIAPP_POSTGRES_BIN_DIR)
      throw new Error("external_infrastructure_requires_explicit_mode");
    return { mode, adminUrl: defaultAdminUrl, redisUrl: defaultRedisUrl, postgresBinDir: null };
  }
  if (mode !== "external") throw new Error("infrastructure_mode_invalid");
  if (Object.entries(env).some(([key, value]) => /^PG/iu.test(key) && value))
    throw new Error("external_infrastructure_inherited_pg_settings");
  const postgres = localUrl(env.MINIAPP_ADMIN_DATABASE_URL, ["postgres:", "postgresql:"], "external_postgres_url_invalid");
  if (!postgres.username || !/^\/[a-z][a-z0-9_]{0,62}$/u.test(postgres.pathname))
    throw new Error("external_postgres_identity_invalid");
  const redis = localUrl(env.MINIAPP_INFRA_REDIS_URL, ["redis:"], "external_redis_url_invalid");
  // BullMQ's existing connection owner uses database zero. Cache and cleanup
  // must use that same database rather than silently splitting the namespace.
  if (!["", "/", "/0"].includes(redis.pathname)) throw new Error("external_redis_database_must_be_zero");
  const postgresBinDir = env.MINIAPP_POSTGRES_BIN_DIR;
  if (!postgresBinDir || !path.isAbsolute(postgresBinDir)) throw new Error("external_postgres_bin_directory_required");
  return { mode, adminUrl: postgres.toString(), redisUrl: redis.toString(), postgresBinDir };
}

export function databaseUrlFor(runtime, databaseName) {
  if (!/^starward_[a-z0-9_]{1,55}$/u.test(databaseName)) throw new Error("database_name_not_owned");
  const url = new URL(runtime.adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function startInfrastructure(runtime, run) {
  if (runtime.mode === "external") return; // The caller owns these services.
  const invocation = dockerComposeInvocation(["-f", composePath, "up", "-d", "--wait"]);
  run(invocation.command, invocation.args);
}

export function assertPostgresTools(runtime) {
  if (runtime.mode !== "external") return;
  for (const tool of ["pg_dump", "pg_restore"]) {
    const executable = path.join(runtime.postgresBinDir, `${tool}${process.platform === "win32" ? ".exe" : ""}`);
    if (!statSync(executable, { throwIfNoEntry: false })?.isFile()) throw new Error(`external_postgres_tool_missing:${tool}`);
  }
}

export function postgresToolInvocation(runtime, tool, databaseName, args, env = process.env, platform = process.platform) {
  if (!["pg_dump", "pg_restore"].includes(tool)) throw new Error("postgres_tool_invalid");
  const url = new URL(databaseUrlFor(runtime, databaseName));
  const connectionArgs = [`--username=${decodeURIComponent(url.username)}`, `--dbname=${databaseName}`];
  if (runtime.mode === "compose") {
    return { ...dockerComposeInvocation(["-f", composePath, "exec", "-T", "postgres", tool, ...connectionArgs, ...args], platform), env };
  }
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !/^PG/iu.test(key)));
  // libpq environment overrides (PGHOSTADDR/PGSERVICE/PGOPTIONS...) must not
  // redirect native tools away from the connection used by SQL readback.
  Object.assign(childEnv, {
    PGHOST: url.hostname.replace(/^\[|\]$/gu, ""), PGPORT: url.port,
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: databaseName, PGPASSFILE: platform === "win32" ? "NUL" : "/dev/null",
  });
  return {
    command: path.join(runtime.postgresBinDir, `${tool}${platform === "win32" ? ".exe" : ""}`),
    args: ["--no-password", ...connectionArgs, ...args], env: childEnv,
  };
}

export function stopOwnedProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else { try { process.kill(pid, "SIGTERM"); } catch {} }
}
