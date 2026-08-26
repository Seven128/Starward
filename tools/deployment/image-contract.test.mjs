import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (await readFile("infrastructure/deployment/miniapp-api.Dockerfile", "utf8")).replace(
  /\r\n?/gu,
  "\n",
);

function stage(name) {
  const marker = ` AS ${name}\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing image stage ${name}`);
  const body = source.slice(start + marker.length);
  const next = body.search(/^FROM /mu);
  return next === -1 ? body : body.slice(0, next);
}

test("release image pins its Dockerfile frontend and base image", () => {
  assert.match(
    source,
    /^# syntax=docker\/dockerfile:1\.7@sha256:[0-9a-f]{64}$/mu,
  );
  const baseReferences = source.match(
    /^FROM node:24\.19\.0-bookworm-slim@sha256:[0-9a-f]{64}/gmu,
  );
  assert.equal(baseReferences?.length, 3);
});

test("runtime dependencies are limited to the API workspace closure", () => {
  const build = stage("build");
  assert.match(build, /npm ci --ignore-scripts/u);
  assert.match(build, /--workspace @starward\/coordinate-system/u);
  assert.match(build, /--workspace @starward\/miniapp-contracts/u);
  assert.match(build, /--workspace @starward\/miniapp-api/u);
  assert.match(build, /--include-workspace-root=false/u);

  const dependencies = stage("production-dependencies");
  assert.match(dependencies, /npm ci --omit=dev --ignore-scripts/u);
  assert.match(dependencies, /--workspace @starward\/coordinate-system/u);
  assert.match(dependencies, /--workspace @starward\/miniapp-contracts/u);
  assert.match(dependencies, /--workspace @starward\/miniapp-api/u);
  assert.match(dependencies, /--include-workspace-root=false/u);

  const runtime = stage("runtime");
  assert.match(
    runtime,
    /COPY --from=production-dependencies --chown=node:node \/app\/node_modules \.\/node_modules/u,
  );
  assert.doesNotMatch(runtime, /COPY --from=build[^\n]*node_modules/u);
  assert.doesNotMatch(build, /npm prune/u);
});

test("runtime image has no mutable operating-system package fetch or bundled init", () => {
  const runtime = stage("runtime");
  assert.doesNotMatch(runtime, /apt-get|apk add|yum install|dnf install/u);
  assert.doesNotMatch(runtime, /dumb-init|tini/u);
  assert.doesNotMatch(runtime, /^ENTRYPOINT /mu);
  assert.match(
    runtime,
    /CMD \["node", "--conditions=production", "workers\/miniapp-api\/dist\/main\.js"\]/u,
  );
});
