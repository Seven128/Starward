import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("infrastructure/deployment/compose.yml", "utf8");
const operatorPreviewCompose = await readFile(
  "infrastructure/deployment/compose.operator-preview.yml",
  "utf8",
);
const operatorPreviewCaddy = await readFile(
  "infrastructure/deployment/Caddyfile.operator-preview",
  "utf8",
);

function service(name) {
  const marker = `\n  ${name}:\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing service ${name}`);
  const rest = source.slice(start + marker.length);
  const next = rest.search(/^  [a-z][a-z0-9_-]*:\s*$/mu);
  return next === -1 ? rest : rest.slice(0, next);
}

test("every long-running container has bounded memory, PIDs and rotated logs", () => {
  const limits = {
    caddy: ["mem_limit: 128m", "pids_limit: 64"],
    api: ["<<: *release-image"],
    worker: ["<<: *release-image"],
    postgres: ["mem_limit: 1g", "pids_limit: 256"],
    redis: ["mem_limit: 256m", "pids_limit: 128", "--maxmemory 192mb"],
  };
  assert.match(source, /x-bounded-logging:[\s\S]*driver: local[\s\S]*max-size: "10m"[\s\S]*max-file: "5"/u);
  assert.match(source, /x-release-image:[\s\S]*mem_limit: 512m[\s\S]*pids_limit: 128[\s\S]*logging: \*bounded-logging/u);
  for (const [name, required] of Object.entries(limits)) {
    const block = service(name);
    for (const value of required) assert.match(block, new RegExp(value.replaceAll("*", "\\*"), "u"));
    if (name !== "api" && name !== "worker")
      assert.match(block, /logging: \*bounded-logging/u);
  }
});

test("release processes use the Compose runtime init boundary", () => {
  assert.match(source, /x-release-image:[\s\S]*init: true/u);
  assert.doesNotMatch(source, /init: false/u);
});

test("only the TLS edge publishes host ports and no service receives the Docker socket", () => {
  assert.match(service("caddy"), /ports:[\s\S]*"80:80"[\s\S]*"443:443"/u);
  for (const name of ["api", "worker", "migrate", "postgres", "redis"])
    assert.doesNotMatch(service(name), /^\s*ports:/mu);
  assert.doesNotMatch(source, /docker\.sock|privileged:\s*true|network_mode:\s*host/iu);
});

test("the API trusts only the fixed Caddy address on the explicit edge subnet", () => {
  assert.match(service("caddy"), /ipv4_address: 172\.30\.10\.2/u);
  assert.match(service("api"), /ipv4_address: 172\.30\.10\.3/u);
  assert.match(source, /edge:[\s\S]*subnet: 172\.30\.10\.0\/29/u);
});

test("operator phone preview exposes only guarded HTTPS on the existing edge", () => {
  assert.match(operatorPreviewCompose, /ports: !override\s*\n\s*- "443:443"/u);
  assert.doesNotMatch(operatorPreviewCompose, /80:80|8787:8787|5432:5432|6379:6379/u);
  assert.match(
    operatorPreviewCompose,
    /STARWARD_OPERATOR_PREVIEW_TOKEN: \$\{STARWARD_OPERATOR_PREVIEW_TOKEN:\?[^}]+\}/u,
  );
  assert.match(operatorPreviewCompose, /Caddyfile\.operator-preview/u);
  assert.match(operatorPreviewCaddy, /https:\/\/\{\$STARWARD_API_DOMAIN\}/u);
  assert.match(operatorPreviewCaddy, /tls internal/u);
  assert.match(
    operatorPreviewCaddy,
    /default_sni \{\$STARWARD_API_DOMAIN\}/u,
  );
  assert.match(operatorPreviewCaddy, /skip_install_trust/u);
  assert.match(operatorPreviewCaddy, /servers \{\s*protocols h1 h2\s*\}/u);
  assert.match(
    operatorPreviewCaddy,
    /@operator header X-Starward-Operator-Preview \{\$STARWARD_OPERATOR_PREVIEW_TOKEN\}/u,
  );
  assert.match(operatorPreviewCaddy, /handle @operator[\s\S]*reverse_proxy api:8787/u);
  assert.match(
    operatorPreviewCaddy,
    /header_up -X-Starward-Operator-Preview/u,
  );
  assert.match(
    operatorPreviewCaddy,
    /request delete/u,
  );
  assert.match(operatorPreviewCaddy, /respond 404/u);
});

test("both edge profiles omit request data in default and access log encoders", async () => {
  for (const profile of ["Caddyfile", "Caddyfile.operator-preview"]) {
    const config = await readFile(`infrastructure/deployment/${profile}`, "utf8");
    const encoders = [...config.matchAll(/format filter \{([^}]+)\}/gu)];
    assert.equal(encoders.length, 2, `${profile}: default/error and access encoders`);
    for (const [, encoder] of encoders) {
      assert.match(encoder, /\brequest delete\b/u);
      assert.match(encoder, /\bresp_headers delete\b/u);
      assert.match(encoder, /\bwrap json\b/u);
    }
    assert.doesNotMatch(config, /format json|log_credentials/u);
  }
});
