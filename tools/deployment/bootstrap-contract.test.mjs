import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bootstrapPath = "infrastructure/deployment/bootstrap-fresh-host.sh";
const source = await readFile(bootstrapPath, "utf8");
const stagingWorkflow = await readFile(".github/workflows/backend-staging.yml", "utf8");
const productionWorkflow = await readFile(".github/workflows/backend-production.yml", "utf8");

test("fresh-host bootstrap fails closed on identity and platform", () => {
  assert.match(source, /confirm-fresh-starward-host/u);
  assert.match(source, /bootstrap_root_required/u);
  assert.match(source, /VERSION_ID:-.*24\.04/u);
  assert.match(source, /uname -m.*x86_64/u);
  assert.match(source, /bootstrap_existing_container_runtime/u);
  assert.match(source, /bootstrap_existing_node_runtime/u);
});

test("fresh-host bootstrap uses authenticated official distributions", () => {
  assert.match(source, /https:\/\/download\.docker\.com\/linux\/ubuntu\/gpg/u);
  assert.match(source, /https:\/\/download\.docker\.com\/linux\/ubuntu/u);
  assert.match(source, /9DC858229FC7DD38854AE2D88D81803C0EBFCD88/u);
  assert.doesNotMatch(source, /get\.docker\.com/u);
  assert.match(source, /node_version=24\.19\.0/u);
  assert.match(source, /14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647/u);
  assert.match(source, /sha256sum --check --status/u);
});

test("fresh-host bootstrap bounds transient artifact-download retries", () => {
  const retryPattern = /--retry 3 --retry-all-errors --retry-delay 2/gu;
  assert.equal([...source.matchAll(retryPattern)].length, 2);
  assert.doesNotMatch(source, /--retry 0|--retry-max-time 0/u);
});

test("fresh-host bootstrap preserves SSH reachability before enabling the firewall", () => {
  const allowSsh = source.indexOf('ufw allow "$ssh_port/tcp"');
  const enableFirewall = source.indexOf("ufw --force enable");

  assert.notEqual(allowSsh, -1);
  assert.notEqual(enableFirewall, -1);
  assert.ok(allowSsh < enableFirewall);
});

test("fresh-host bootstrap stays manual and outside release workflows", () => {
  assert.doesNotMatch(stagingWorkflow, /bootstrap-fresh-host/u);
  assert.doesNotMatch(productionWorkflow, /bootstrap-fresh-host/u);
});
