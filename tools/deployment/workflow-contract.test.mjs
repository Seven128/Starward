import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workflowRoot = path.resolve(".github", "workflows");

async function workflow(name) {
  return readFile(path.join(workflowRoot, name), "utf8");
}

test("product CI checks release products without design or Context gates", async () => {
  const source = await workflow("product-ci.yml");
  assert.match(source, /npm audit --omit=dev --workspace @starward\/miniapp-api --audit-level=high/u);
  assert.match(source, /npm run test:deployment/u);
  assert.match(source, /npm run check:miniapp:release-code/u);
  assert.match(source, /docker build/u);
  assert.doesNotMatch(source, /design|validate-harness|context:|wechat.*upload/iu);
});

test("staging privilege follows only a successful trusted main push", async () => {
  const source = await workflow("backend-staging.yml");
  assert.match(source, /workflow_run:/u);
  assert.match(source, /workflow_run\.event == 'push'/u);
  assert.match(source, /workflow_run\.head_branch == 'main'/u);
  assert.match(source, /workflow_run\.head_repository\.full_name == github\.repository/u);
  assert.match(source, /workflow_run\.conclusion == 'success'/u);
  assert.match(source, /STARWARD_STAGING_CD_ENABLED == 'true'/u);
  assert.match(source, /environment: staging/u);
  assert.doesNotMatch(source, /packages: write|ghcr\.io|GITHUB_TOKEN/u);
  assert.match(source, /STARWARD_REGISTRY_HOST/u);
  assert.match(source, /STARWARD_REGISTRY_USERNAME/u);
  assert.match(source, /STARWARD_IMAGE_REPOSITORY/u);
  assert.match(source, /STARWARD_REGISTRY_PASSWORD/u);
  assert.match(source, /RepoDigests/u);
  assert.match(source, /docker logout/u);
  assert.match(source, /host-preflight\.sh/u);
});

test("production is a manual exact-digest promotion and never rebuilds", async () => {
  const source = await workflow("backend-production.yml");
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /environment: production/u);
  assert.match(source, /confirm_image_digest:/u);
  assert.match(source, /staging_receipt_path:/u);
  assert.match(source, /STARWARD_PRODUCTION_CD_ENABLED == 'true'/u);
  assert.doesNotMatch(source, /docker build|docker push/iu);
  assert.match(source, /STARWARD_IMAGE_REPOSITORY/u);
  assert.match(source, /image_ref="\$IMAGE_REPOSITORY@\$IMAGE_DIGEST"/u);
  assert.doesNotMatch(source, /ghcr\.io/u);
  assert.match(source, /host-preflight\.sh/u);
});

test("WeChat platform operations use a protected dedicated runner and never publish from product CI", async () => {
  const product = await workflow("product-ci.yml");
  const source = await workflow("wechat-platform.yml");
  assert.doesNotMatch(product, /run:\s+npm run miniapp:platform|WECHAT_UPLOAD_PRIVATE_KEY/u);
  assert.match(product, /npm run test:miniapp:platform/u);
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /github\.ref == 'refs\/heads\/main'/u);
  assert.match(source, /environment:\s+name: wechat-\$\{\{ inputs\.lane \}\}/u);
  assert.match(source, /starward-wechat-uploader/u);
  assert.match(source, /npm ci --ignore-scripts --prefix tools\/miniapp-uploader/u);
  assert.match(source, /STARWARD_WECHAT_UPLOAD_PRIVATE_KEY/u);
  assert.match(source, /production_confirmation/u);
  assert.doesNotMatch(source, /deployment:promote|STARWARD_SSH_PRIVATE_KEY|packages: write/u);
});
