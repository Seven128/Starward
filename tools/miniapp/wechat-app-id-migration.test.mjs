import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  inspectWechatAppId,
  migrateWechatAppId,
} from "./wechat-app-id-migration.mjs";

const oldAppId = `wx${"1".repeat(16)}`;
const newAppId = `wx${"2".repeat(16)}`;

async function fixture(t, { privateAppId = oldAppId } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-app-id-"));
  const publicPath = path.join(root, "apps", "wechat-miniapp", "project.config.json");
  const privatePath = path.join(root, "apps", "wechat-miniapp", "project.private.config.json");
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(
    publicPath,
    `${JSON.stringify({
      appid: oldAppId,
      projectname: "Tonight",
      compileType: "miniprogram",
      setting: { urlCheck: false },
    }, null, 2)}\n`,
  );
  if (privateAppId !== null)
    await writeFile(
      privatePath,
      `${JSON.stringify({ appid: privateAppId, projectname: "local" }, null, 2)}\n`,
    );
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    publicPath,
    privatePath,
    trackedAppIdFiles: ["apps/wechat-miniapp/project.config.json"],
  };
}

test("identity inspection requires one tracked AppID and matching local identity", async (t) => {
  const selected = await fixture(t);
  const identity = await inspectWechatAppId(selected);
  assert.equal(identity.appId, oldAppId);
  await assert.rejects(
    inspectWechatAppId({
      ...selected,
      trackedAppIdFiles: [
        ...selected.trackedAppIdFiles,
        "docs/old-account.md",
      ],
    }),
    /wechat_app_id_tracked_identity_ambiguous/u,
  );
});

test("a local private AppID mismatch fails before migration", async (t) => {
  const selected = await fixture(t, { privateAppId: newAppId });
  await assert.rejects(
    inspectWechatAppId(selected),
    /wechat_app_id_private_identity_mismatch/u,
  );
});

test("migration defaults to a redacted plan and apply changes both owned configs", async (t) => {
  const selected = await fixture(t);
  const beforePublic = await readFile(selected.publicPath);
  const plan = await migrateWechatAppId({
    ...selected,
    fromAppId: oldAppId,
    toAppId: newAppId,
  });
  assert.equal(plan.status, "planned");
  assert.equal((await readFile(selected.publicPath)).equals(beforePublic), true);
  assert.doesNotMatch(JSON.stringify(plan), new RegExp(`${oldAppId}|${newAppId}`, "u"));

  const applied = await migrateWechatAppId({
    ...selected,
    fromAppId: oldAppId,
    toAppId: newAppId,
    apply: true,
  });
  assert.equal(applied.status, "applied");
  assert.equal(JSON.parse(await readFile(selected.publicPath, "utf8")).appid, newAppId);
  assert.equal(JSON.parse(await readFile(selected.privatePath, "utf8")).appid, newAppId);
});

test("migration rejects an unexpected current identity", async (t) => {
  const selected = await fixture(t);
  await assert.rejects(
    migrateWechatAppId({
      ...selected,
      fromAppId: newAppId,
      toAppId: `wx${"3".repeat(16)}`,
      apply: true,
    }),
    /wechat_app_id_expected_current_mismatch/u,
  );
});

test("a second-file failure restores the public config owned by the migration", async (t) => {
  const selected = await fixture(t);
  const beforePublic = await readFile(selected.publicPath);
  let calls = 0;
  const replaceFile = async (selectedPath, bytes) => {
    calls += 1;
    if (calls === 2) throw new Error("simulated_private_write_failure");
    await writeFile(selectedPath, bytes);
  };
  await assert.rejects(
    migrateWechatAppId({
      ...selected,
      fromAppId: oldAppId,
      toAppId: newAppId,
      apply: true,
      replaceFile,
    }),
    /simulated_private_write_failure/u,
  );
  assert.equal((await readFile(selected.publicPath)).equals(beforePublic), true);
  assert.equal(JSON.parse(await readFile(selected.privatePath, "utf8")).appid, oldAppId);
});
