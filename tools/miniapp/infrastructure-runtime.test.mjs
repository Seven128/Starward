import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { assertPostgresTarget, databaseUrlFor, postgresToolInvocation, readInfrastructureRuntime, startInfrastructure } from "./infrastructure-runtime.mjs";

const local = {
  MINIAPP_INFRA_MODE: "external",
  MINIAPP_ADMIN_DATABASE_URL: "postgresql://task_user:p%40ss@127.0.0.1:54391/postgres",
  MINIAPP_INFRA_REDIS_URL: "redis://127.0.0.1:56380/0",
  MINIAPP_POSTGRES_BIN_DIR: path.resolve("tmp", "postgres", "bin"),
};

test("owned Compose port/project selection stays identical for SQL, startup and dump/restore", () => {
  const selected = {COMPOSE_PROJECT_NAME: 'starward-isolated-recovery', MINIAPP_POSTGRES_PORT: '55433', MINIAPP_REDIS_PORT: '56380'};
  const runtime = readInfrastructureRuntime(selected);
  assert.equal(new URL(databaseUrlFor(runtime, 'starward_restore_port_check')).port, '55433');
  assert.equal(new URL(runtime.redisUrl).port, '56380');
  const calls = [];
  startInfrastructure(runtime, (...args) => calls.push(args));
  for (const [key, value] of Object.entries(selected)) assert.equal(calls[0][2].env[key], value);
  const invocation = postgresToolInvocation(runtime, 'pg_restore', 'starward_restore_port_check', [],
    {COMPOSE_PROJECT_NAME: 'different-later-project', MINIAPP_POSTGRES_PORT: '55432', PATH: 'preserved'}, 'linux');
  for (const [key, value] of Object.entries(selected)) assert.equal(invocation.env[key], value);
  assert.equal(invocation.env.PATH, 'preserved');
});

test("Compose recovery rejects a live port mismatch before database effects", () => {
  const runtime = readInfrastructureRuntime({COMPOSE_PROJECT_NAME: 'starward-isolated-recovery', MINIAPP_POSTGRES_PORT: '55433'});
  assert.doesNotThrow(() => assertPostgresTarget(runtime, (_command, args, options) => {
    assert.deepEqual(args.slice(-3), ['port', 'postgres', '5432']);
    assert.equal(options.env.COMPOSE_PROJECT_NAME, 'starward-isolated-recovery');
    return {status: 0, stdout: '127.0.0.1:55433\n'};
  }));
  for (const stdout of ['127.0.0.1:55432\n', '0.0.0.0:55433\n', ''])
    assert.throws(() => assertPostgresTarget(runtime, () => ({status: 0, stdout})), /endpoint_mismatch/u);
  for (const value of ['0', '65536', 'remote:5432', ''])
    assert.throws(() => readInfrastructureRuntime({MINIAPP_POSTGRES_PORT: value}), /compose_port_invalid/u);
});

test("default compose keeps the container target and external never starts managed services", () => {
  const compose = readInfrastructureRuntime({});
  const calls = [];
  startInfrastructure(compose, (...args) => calls.push(args));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].slice(-3), ["up", "-d", "--wait"]);
  const command = postgresToolInvocation(compose, "pg_dump", "starward_verify_test", ["--format=custom"], {}, "linux");
  assert.equal(command.command, "docker");
  assert.deepEqual(command.args.slice(-5), ["postgres", "pg_dump", "--username=starward_miniapp", "--dbname=starward_verify_test", "--format=custom"]);
  startInfrastructure(readInfrastructureRuntime(local), () => assert.fail("external services belong to the caller"));
  assert.throws(() => readInfrastructureRuntime({ MINIAPP_ADMIN_DATABASE_URL: local.MINIAPP_ADMIN_DATABASE_URL }), /compose_admin_database_url_mismatch/);
});

test("SQL and native dump/restore share one endpoint without inherited libpq redirection", () => {
  const runtime = readInfrastructureRuntime(local);
  const database = "starward_restore_verify_test";
  const url = new URL(databaseUrlFor(runtime, database));
  for (const tool of ["pg_dump", "pg_restore"]) {
    const invocation = postgresToolInvocation(runtime, tool, database, ["--no-owner"], {
      PATH: "keep", PGHOSTADDR: "203.0.113.8", PGSERVICE: "production", PGOPTIONS: "unsafe", PGPASSWORD: "old",
    });
    assert.equal(path.dirname(invocation.command), local.MINIAPP_POSTGRES_BIN_DIR);
    assert.equal(invocation.env.PGHOST, url.hostname);
    assert.equal(invocation.env.PGPORT, url.port);
    assert.equal(invocation.env.PGUSER, "task_user");
    assert.equal(invocation.env.PGPASSWORD, "p@ss");
    assert.equal(invocation.env.PGDATABASE, database);
    assert.equal(invocation.env.PATH, "keep");
    for (const key of ["PGHOSTADDR", "PGSERVICE", "PGOPTIONS"]) assert.equal(invocation.env[key], undefined);
    assert.equal(invocation.args.some(arg => arg.includes("p@ss")), false);
    assert.ok(invocation.args.includes(`--dbname=${database}`));
  }
});

test("external targets reject remote redirects, unspecified ports and Redis database drift", () => {
  for (const url of [
    "postgresql://u@127.0.0.1:0/postgres",
    "postgresql://u@db.example.com:5432/postgres", "postgresql://u@127.0.0.1/postgres",
    "postgresql://u@127.0.0.1:5432/postgres?host=remote", "postgresql://u@127.0.0.1:5432/postgres?hostaddr=203.0.113.8",
    "postgresql://u@127.0.0.1:5432/postgres#other", "postgresql://u@127.0.0.1:5432/",
  ]) assert.throws(() => readInfrastructureRuntime({ ...local, MINIAPP_ADMIN_DATABASE_URL: url }), /external_postgres/);
  for (const url of ["redis://127.0.0.1:56380/1", "redis://127.0.0.1:56380/0?db=1", "redis://remote:6379", "redis://127.0.0.1"])
    assert.throws(() => readInfrastructureRuntime({ ...local, MINIAPP_INFRA_REDIS_URL: url }), /external_redis/);
  assert.throws(() => readInfrastructureRuntime({ ...local, MINIAPP_POSTGRES_BIN_DIR: "relative/bin" }), /bin_directory_required/);
  for (const key of ["PGPASSWORD", "PGHOSTADDR", "PGSERVICE", "PGOPTIONS", "PGSSLMODE"])
    assert.throws(() => readInfrastructureRuntime({ ...local, [key]: "inherited" }), /inherited_pg_settings/);
  assert.throws(() => databaseUrlFor(readInfrastructureRuntime(local), 'postgres";drop'), /database_name_not_owned/);
});
