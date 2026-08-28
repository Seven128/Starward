import { chmod, rm } from "node:fs/promises";
import path from "node:path";
import { createReleaseEnvironmentFixture, releaseRevision } from "./test-support.mjs";
import { readEnvironmentFile } from "./env-file.mjs";

export const token = "p".repeat(43);
export async function fixture(t, overrides = {}) {
  const result = await createReleaseEnvironmentFixture({
    api: { MINIAPP_AUTH_MODE: "LOCAL_TEST", MINIAPP_ACCEPTANCE_MODE: "1", MINIAPP_CORS_ORIGINS: "https://192.0.2.8" },
    deploy: { STARWARD_API_DOMAIN: "192.0.2.8", STARWARD_OPERATOR_PREVIEW_TOKEN: token },
    ...overrides,
  });
  await chmod(path.join(result.root, "backup.key"), 0o600);
  t.after(() => rm(result.root, { recursive: true, force: true }));
  return result;
}

export function configuration(deploy) {
  const identity = Object.fromEntries(["STARWARD_ENVIRONMENT", "STARWARD_RELEASE_REVISION", "STARWARD_IMAGE_DIGEST", "STARWARD_RELEASED_AT"].map((key) => [key, deploy[key]]));
  return {
    name: "starward-staging",
    services: {
      ...Object.fromEntries(["api", "worker", "migrate"].map((name) => [name, { image: deploy.STARWARD_IMAGE_REF, environment: identity }])),
      caddy: {
        ports: [{ published: "443", target: 443, protocol: "tcp" }],
        environment: { STARWARD_OPERATOR_PREVIEW_TOKEN: token, STARWARD_API_DOMAIN: "192.0.2.8" },
        volumes: [{ source: "/release/Caddyfile.operator-preview", target: "/etc/caddy/Caddyfile", read_only: true }],
      },
      postgres: { volumes: [{ type: "volume", source: "postgres-data", target: "/var/lib/postgresql/data" }] },
      redis: { volumes: [{ type: "volume", source: "redis-data", target: "/data" }] },
    },
    volumes: Object.fromEntries(["postgres-data", "redis-data"].map((name) => [name, { name: `starward-staging_${name}` }])),
  };
}
export const rows = ["api", "worker", "caddy", "postgres", "redis"].map((Service) => ({
  Service, State: "running", Health: "healthy",
  Publishers: Service === "caddy" ? [{ PublishedPort: 443, TargetPort: 443, Protocol: "tcp" }] : [],
}));

export async function dependencies(t) {
  const f = await fixture(t);
  const deploy = await readEnvironmentFile(f.deployPath);
  const calls = [];
  const execute = ({ step, args }) => {
    calls.push({ step, args });
    let value = "";
    if (step === "preview-compose-config") value = JSON.stringify(configuration(deploy));
    if (step === "preview-container-state") value = JSON.stringify(rows);
    if (step === "preview-image-revision") value = releaseRevision;
    return { stdout: Buffer.from(value), stderr: Buffer.alloc(0) };
  };
  const backup = async () => { calls.push({ step: "backup" }); return { manifestPath: "/private/backup.json" }; };
  const readiness = async () => { calls.push({ step: "readiness" }); return { ready: true }; };
  return { f, deploy, calls, execute, backup, readiness };
}
