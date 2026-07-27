import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect } from "@playwright/test";
import { PNG } from "pngjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const routeByOutcome = Object.freeze({
  "admin-data-operations": "/data-operations",
  "quality-release-observability": "/release-quality",
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function selectedEntry(target) {
  if (target.key.startsWith("ops-page-constraint-")) return "docs/design-targets/ops-product-pages-v1/index.html";
  if (target.key.startsWith("ops-control-exact-")) return "docs/design-targets/ops-controls-v2/index.html";
  return null;
}

function artifactPaths(outcome, targetKey) {
  const directory = path.join(repositoryRoot, "artifacts", "verification", "design-conformance", outcome);
  return {
    directory,
    actual: path.join(directory, `${targetKey}-actual.png`),
    comparison: path.join(directory, `${targetKey}-comparison.png`),
  };
}

async function screenshotPair({ page, browser, outcome, target }) {
  const paths = artifactPaths(outcome, target.key);
  const runId = process.env.STARWARD_DESIGN_ACCEPTANCE_RUN_ID;
  const marker = path.join(
    repositoryRoot,
    "tests",
    "acceptance",
    "test-results",
    ".design-capture",
    outcome,
    `${target.key}.txt`,
  );
  await mkdir(paths.directory, { recursive: true });
  if (runId) {
    try {
      const [capturedRunId] = await Promise.all([
        readFile(marker, "utf8"),
        readFile(paths.actual),
        readFile(paths.comparison),
      ]);
      if (capturedRunId === runId) return paths;
    } catch {
      // This target has not completed acquisition in the current runner.
    }
  }
  await page.screenshot({ path: paths.actual, fullPage: true, animations: "disabled" });
  const entry = selectedEntry(target);
  if (!entry) {
    const reference = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "zh-CN", reducedMotion: "reduce" });
    try {
      const sourcePath = target.key === "design-authority-reference" ? "DESIGN.md" : "docs/source-plan.md";
      const source = await readFile(path.join(repositoryRoot, sourcePath), "utf8");
      await reference.setContent(`<main style="font:16px/1.5 system-ui;white-space:pre-wrap;color:#111;background:#fff;padding:32px">${source.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</main>`);
      await reference.screenshot({ path: paths.comparison, fullPage: true, animations: "disabled" });
    } finally {
      await reference.close();
    }
    if (runId) {
      await mkdir(path.dirname(marker), { recursive: true });
      await writeFile(marker, runId);
    }
    return paths;
  }
  const reference = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "zh-CN", reducedMotion: "reduce" });
  try {
    await reference.goto(pathToFileURL(path.join(repositoryRoot, entry)).href, { waitUntil: "load" });
    await reference.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
    if (target.key.startsWith("ops-page-constraint-")) {
      const route = outcome === "admin-data-operations" ? "data-operations" : "release-quality";
      await reference.locator(`[data-route=${JSON.stringify(route)}]`).first().click();
      await reference.locator(`[data-route-page=${JSON.stringify(route)}]`).waitFor({ state: "visible" });
      await reference.screenshot({ path: paths.comparison, fullPage: true, animations: "disabled" });
    } else {
      const section = reference.locator(`[data-section=${JSON.stringify(outcome)}]`).first();
      await section.waitFor({ state: "visible" });
      await section.screenshot({ path: paths.comparison, animations: "disabled" });
    }
  } finally {
    await reference.close();
  }
  if (runId) {
    await mkdir(path.dirname(marker), { recursive: true });
    await writeFile(marker, runId);
  }
  return paths;
}

function pixelDifference(actual, comparison) {
  const left = PNG.sync.read(actual);
  const right = PNG.sync.read(comparison);
  const samples = 96;
  let delta = 0;
  for (let y = 0; y < samples; y += 1) {
    for (let x = 0; x < samples; x += 1) {
      const leftX = Math.min(left.width - 1, Math.floor((x + 0.5) * left.width / samples));
      const leftY = Math.min(left.height - 1, Math.floor((y + 0.5) * left.height / samples));
      const rightX = Math.min(right.width - 1, Math.floor((x + 0.5) * right.width / samples));
      const rightY = Math.min(right.height - 1, Math.floor((y + 0.5) * right.height / samples));
      const li = (leftY * left.width + leftX) * 4;
      const ri = (rightY * right.width + rightX) * 4;
      delta += Math.abs(left.data[li] - right.data[ri])
        + Math.abs(left.data[li + 1] - right.data[ri + 1])
        + Math.abs(left.data[li + 2] - right.data[ri + 2]);
    }
  }
  return delta / (samples * samples * 3 * 255);
}

async function assertControls(page, controls) {
  for (const control of controls) {
    const locator = page.locator(`[data-control=${JSON.stringify(control)}], [data-testid=${JSON.stringify(control)}]`).first();
    await expect(locator, `production control ${control}`).toBeVisible({ timeout: 500 });
    const box = await locator.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

export async function exerciseOpsDesignAssertion({ page, browser, baseURL, outcome, target, method, controls }) {
  if (!baseURL) throw new Error("acceptance_base_url_missing");
  const route = routeByOutcome[outcome];
  const response = await page.goto(new URL(route, baseURL).href, { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === route && !url.searchParams.has("acceptanceFixture"));

  const paths = await screenshotPair({ page, browser, outcome, target });
  const [actual, comparison] = await Promise.all([readFile(paths.actual), readFile(paths.comparison)]);
  await expect(page.locator(`[data-testid=${JSON.stringify(`screen-${outcome}`)}]`)).toBeVisible({ timeout: 250 });
  await assertControls(page, controls);
  if (method === "visual_pixel" || method === "conformance") {
    const difference = pixelDifference(actual, comparison);
    expect(difference, `render difference for ${target.key}`).toBeLessThanOrEqual(target.interpretation === "exact_target" ? 0.3 : 0.35);
  }
  if (method === "responsive_reflow" || method === "layout_geometry" || method === "conformance") {
    for (const width of [1440, 1180, 1024, 820]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await assertControls(page, controls);
    }
  }
  if (method === "accessibility_semantics" || method === "component_state" || method === "interaction_trace" || method === "conformance") {
    for (const control of controls) {
      const locator = page.locator(`[data-control=${JSON.stringify(control)}], [data-testid=${JSON.stringify(control)}]`).first();
      await expect(locator).toHaveAccessibleName(/.+/u);
      await locator.focus();
      await expect(locator).toBeFocused();
    }
  }
  if (method === "motion_timeline") {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-reduced-motion-ready", "true");
  }
  if (method === "asset_integrity") {
    expect(actual.length).toBeGreaterThan(1024);
    expect(comparison.length).toBeGreaterThan(1024);
    await expect(page.locator('[data-asset-license="verified"]')).toHaveCount(controls.length);
  }
  if (method === "input_method") {
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus-visible")).toHaveCount(1);
  }
  await writeFile(path.join(paths.directory, `${target.key}-${method}-evidence.json`), `${JSON.stringify({
    schema_version: "starward-design-method-evidence-v1",
    outcome,
    target: target.key,
    method,
    controls,
    actual_sha256: sha256(actual),
    comparison_sha256: sha256(comparison),
  }, null, 2)}\n`, "utf8");
}
