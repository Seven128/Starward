import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("infrastructure/deployment/host-preflight.sh", "utf8");

test("host preflight closes the selected runtime and capacity envelope", () => {
  assert.match(source, /VERSION_ID:-.*24\.04/u);
  assert.match(source, /uname -m.*x86_64/u);
  assert.match(source, /cpu_count.*-ge 4/u);
  assert.match(source, /memory_kib.*-ge 3670016/u);
  assert.match(source, /available_kib.*-ge 10485760/u);
  assert.match(source, /node_major.*= 24/u);
  assert.match(source, /docker version/u);
  assert.match(source, /docker compose version/u);
});

test("host preflight is read-only and never provisions around a failure", () => {
  assert.doesNotMatch(
    source,
    /\b(?:apt|apt-get|apk|dnf|yum|pacman|zypper|mkdir|chmod|chown|systemctl|ufw|firewall-cmd)\b|\bdocker\s+(?:pull|run|exec|rm|compose\s+(?:up|down|pull|run))/u,
  );
});
