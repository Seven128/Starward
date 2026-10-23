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
  assert.match(source, /if: steps\.scope\.outputs\.consumers == 'true'\s+run: npm run check:product:consumers/u);
  assert.match(source, /docker build/u);
  assert.doesNotMatch(source, /design|validate-harness|context:|wechat.*upload/iu);
});

test("product consumer checks run actual workspace owners without generating a shared candidate", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const checks = pkg.scripts["check:product:consumers"];
  assert.match(checks, /npm run test:mobile:fast/u);
  assert.match(checks, /npm run typecheck --workspace @starward\/api/u);
  assert.match(checks, /npm run test --workspace @starward\/api/u);
  assert.match(checks, /npm run typecheck --workspace @starward\/admin-web/u);
  assert.match(checks, /node tools\/run-node\.cjs --test tools\/miniapp\/admin-page\.test\.mjs tools\/miniapp\/admin-session\.test\.mjs tools\/miniapp\/admin-operations-client\.test\.mjs/u);
  const admin = JSON.parse(await readFile("apps/admin-web/package.json", "utf8"));
  assert.match(admin.scripts.typecheck, /tsc --noEmit/u);
  assert.doesNotMatch(checks, /build|devtools|device|preview/u);
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
  assert.match(source, /needs\.qualify\.outputs\.product_checked == 'true'/u);
  assert.match(source, /actions\/runs\/\$RUN_ID\/attempts\/\$RUN_ATTEMPT\/jobs/u);
  assert.match(source, /Construct production OCI image/u);
});

test("staging admits the host before publishing and rechecks before remote transfer", async () => {
  const source = await workflow("backend-staging.yml");
  const steps = source.split(/(?=^      - )/mu);
  const admission = steps.find((step) => step.includes("name: Check staging host before image publication"));
  assert.ok(admission, "host readiness must gate image publication");
  assert.match(admission, /DIAGNOSTIC_MODE: host/u);
  for (const [field, secret] of [
    ["SSH_CONNECTION", "STARWARD_DIAGNOSTIC_CONNECTION"],
    ["SSH_PRIVATE_KEY", "STARWARD_SSH_PRIVATE_KEY"],
    ["SSH_KNOWN_HOSTS", "STARWARD_SSH_KNOWN_HOSTS"],
  ]) assert.ok(admission.includes(`${field}: \${{ secrets.${secret} }}`));
  assert.match(admission, /^        run: node tools\/deployment\/run-host-diagnostics\.mjs\s*$/mu);
  assert.doesNotMatch(admission, /^\s+(?:if|continue-on-error):/mu,
    "an unavailable host must fail both manual and automatic publication");
  const orderedSteps = [
    "Validate deployment configuration inputs",
    "Check staging host before image publication",
    "Prepare current resource versions",
    "Build and publish the immutable release image",
    "Preflight staging host without mutation",
    "Promote exact image to staging",
  ].map((name) => source.indexOf(`name: ${name}`));
  assert.ok(orderedSteps.every((position, index) => position >= 0 &&
    (index === 0 || orderedSteps[index - 1] < position)),
  "early host admission must precede publication; the final preflight must still precede transfer");
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

test("manual staging rechecks product CI and selects an explicit protected lane", async () => {
  const source = await workflow("backend-staging.yml");
  assert.match(source, /workflow_dispatch:/u);
  assert.match(source, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/u);
  assert.match(source, /STARWARD_STAGING_LANE \|\| 'domain'/u);
  assert.match(source, /--lane "\$DEPLOYMENT_LANE"/u);
  assert.match(source, /npm run test:miniapp:infrastructure/u);
  assert.match(source, /npm run miniapp:bundle -- --lane ci/u);
  for (const pipeline of [source, await workflow("product-ci.yml")]) {
    const build = pipeline.indexOf("npm run miniapp:bundle -- --lane ci");
    const inspect = pipeline.indexOf("node --test tools/miniapp/built-candidate.test.mjs");
    const infrastructure = pipeline.indexOf("npm run test:miniapp:infrastructure");
    assert.ok(build >= 0 && build < inspect && inspect < infrastructure,
      "actual bundle inspection must run after build in automatic and manual product paths");
  }
  assert.match(source, /cancel-in-progress: false/u);
  assert.match(source, /--sort=name --mtime=@0/u);
  assert.match(source, /\$GITHUB_RUN_ID-\$GITHUB_RUN_ATTEMPT\/deploy\.env/u);
  assert.doesNotMatch(source, /STARWARD_OPERATOR_PREVIEW_TOKEN|rejectUnauthorized|down -v/u);
});

test("staging and production control packages carry the edge resource classification", async () => {
  const categories = await readFile("infrastructure/deployment/sky-resource-logging.caddy", "utf8");
  assert.match(categories, /log_append @sky_catalog sky_resource_class "catalog"/u);
  for (const name of ["backend-staging.yml", "backend-production.yml"]) {
    const source = await workflow(name);
    assert.match(source,
      /tar [^\n]*-czf "\$archive" package\.json tools\/run-node\.cjs tools\/deployment infrastructure\/deployment/u,
      `${name}: control archive must contain the complete deployment directory`);
  }
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
  assert.match(source, /WECHAT_SKY_RESOURCE_ORIGIN: \$\{\{ vars\.STARWARD_WECHAT_SKY_RESOURCE_ORIGIN \}\}/u);
  assert.match(source, /--sky-resource-origin "\$\{WECHAT_SKY_RESOURCE_ORIGIN:-\$WECHAT_API_ORIGIN\}"/u);
  assert.match(source, /MINIAPP_BUILT_CANDIDATE_MANIFEST="\$GITHUB_WORKSPACE\/artifacts\/miniapp\/release\/\$WECHAT_LANE\.manifest\.json"/u);
  assert.match(source, /node --test tools\/miniapp\/built-candidate\.test\.mjs/u);
  assert.doesNotMatch(source, /deployment:promote|STARWARD_SSH_PRIVATE_KEY|packages: write/u);
});
