import assert from "node:assert/strict";
import test from "node:test";
import { loadActionsConnection } from "./load-actions-connection.mjs";
import { parseDeploymentConnection } from "./deployment-connection.mjs";
const packet = { SSH_HOST: "fixture.example.com", SSH_PORT: "22", SSH_USER: "deploy", REMOTE_INBOX: "/fixture/inbox", REMOTE_RELEASE_ROOT: "/fixture/releases", REMOTE_CANDIDATE_ROOT: "/fixture/candidates", REMOTE_BASE_DEPLOY_ENV: "/fixture/base.env" };

test("all scalar values are masked before Actions can print an exported connection", () => {
  const events = [];
  loadActionsConnection({ GITHUB_ACTIONS: "true", GITHUB_ENV: "/runner/environment", SSH_CONNECTION: JSON.stringify(packet) },
    line => events.push(line), (file, value) => events.push({ file, value }));
  assert.deepEqual(events.slice(0, 7), Object.values(packet).map(value => `::add-mask::${value}`));
  assert.deepEqual(events[7], { file: "/runner/environment", value: Object.entries(packet).map(([key, value]) => `${key}=${value}\n`).join("") });
});

test("invalid or non-Actions inputs cannot export or print any connection data", () => {
  for (const changes of [{ SSH_PORT: "65536" }, { SSH_HOST: "-host" }, { SSH_USER: "user\ninjected" }, { REMOTE_INBOX: "/fixture/../escape" }, { REMOTE_INBOX: "/path;command" }]) {
    let effect = false;
    assert.throws(() => loadActionsConnection({ GITHUB_ACTIONS: "true", GITHUB_ENV: "/runner/environment", SSH_CONNECTION: JSON.stringify({ ...packet, ...changes }) }, () => { effect = true; }, () => { effect = true; }), /invalid/);
    assert.equal(effect, false);
  }
  assert.throws(() => loadActionsConnection({ SSH_CONNECTION: JSON.stringify(packet) }), /requires_actions/);
  assert.deepEqual(parseDeploymentConnection(JSON.stringify({ ...packet, OTHER_SECRET: "ignored" })), packet);
});
