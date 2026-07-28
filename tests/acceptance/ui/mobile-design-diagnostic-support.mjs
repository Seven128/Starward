import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

const uiRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(uiRoot, "../../..");
const pageTargetPath = path.join(
  repositoryRoot,
  "docs/design-targets/mobile-product-pages-v2/index.html",
);
const controlTargetPath = path.join(
  repositoryRoot,
  "docs/design-targets/mobile-controls-v3/index.html",
);
const pageCoverage = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/design-targets/mobile-product-pages-v2/coverage-manifest.json"),
  "utf8",
));
const controlContract = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/design-targets/mobile-controls-v3/implementation-contract.json"),
  "utf8",
));
const handoffContent = await readFile(
  path.join(repositoryRoot, "docs/design-resources/starward-residual-implementation-handoff.md"),
  "utf8",
);
const handoffMatch = /```yaml design-resource-handoff-v1\r?\n([\s\S]*?)\r?\n```/u.exec(handoffContent);
if (!handoffMatch) throw new Error("mobile_web_diagnostic_handoff_missing");
const handoff = YAML.parse(handoffMatch[1]);
const requireFromAcceptance = createRequire(path.join(repositoryRoot, "tests/acceptance/package.json"));
const { PNG } = requireFromAcceptance(requireFromAcceptance.resolve("pngjs"));

const supportedModes = Object.freeze(["planning", "night", "red-light"]);
const appearanceModeTestIds = Object.freeze({
  planning: "appearance-mode-planning",
  night: "appearance-mode-night",
  "red-light": "appearance-mode-red-light",
});

async function collectProductionTsxFiles(directory, entries = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectProductionTsxFiles(target, entries);
    else if (entry.isFile() && /\.(?:jsx|tsx)$/iu.test(entry.name)) entries.push(target);
  }
  return entries;
}

const productionTsxCorpus = await Promise.all(
  (await collectProductionTsxFiles(path.join(repositoryRoot, "apps/mobile/src"))).map(
    async (file) => ({ file, text: await readFile(file, "utf8") }),
  ),
);

function diagnosticProgress(phase, details = {}) {
  const line = `STARWARD_MOBILE_WEB_DIAGNOSTIC_PROGRESS:${JSON.stringify({
    phase,
    ...details,
  })}\n`;
  process.stderr.write(line);
  if (process.env.STARWARD_WEB_DIAGNOSTIC_PROGRESS_FILE) {
    appendFileSync(process.env.STARWARD_WEB_DIAGNOSTIC_PROGRESS_FILE, line, "utf8");
  }
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function productionWebTestIds(controlId) {
  const escaped = escapeRegularExpression(controlId);
  const patterns = [
    new RegExp(
      `testID\\s*=\\s*\\{\\s*Platform\\.OS\\s*===\\s*["']web["']\\s*\\?\\s*["']([^"']+)["']\\s*:\\s*["']${escaped}["']\\s*\\}`,
      "gu",
    ),
    new RegExp(
      `testID\\s*=\\s*\\{\\s*Platform\\.OS\\s*!==\\s*["']web["']\\s*\\?\\s*["']${escaped}["']\\s*:\\s*["']([^"']+)["']\\s*\\}`,
      "gu",
    ),
  ];
  const testIds = new Set([controlId]);
  for (const entry of productionTsxCorpus) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (const match of entry.text.matchAll(pattern)) testIds.add(match[1]);
    }
  }
  return [...testIds];
}

async function productionControlLocator(page, controlId) {
  const selectors = productionWebTestIds(controlId).flatMap((testId) => [
    `[data-testid=${JSON.stringify(testId)}]`,
    `[aria-label=${JSON.stringify(testId)}]`,
    `[aria-label^=${JSON.stringify(`${testId}:`)}]`,
    `[aria-label^=${JSON.stringify(`${testId} ·`)}]`,
  ]);
  for (const selector of selectors) {
    const locator = page.locator(selector);
    if (await locator.count()) {
      const candidate = locator.first();
      if (await candidate.isVisible()) return { locator: candidate, selector };
    }
  }
  throw new Error(
    `mobile_web_diagnostic_production_control_missing:${controlId}:${selectors.join("|")}`,
  );
}

async function captureVisibleLocator(page, locator, identity) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box || box.width < 1 || box.height < 1) {
    throw new Error(`mobile_web_diagnostic_capture_bounds_missing:${identity}`);
  }
  const viewport = page.viewportSize();
  if (!viewport) throw new Error(`mobile_web_diagnostic_viewport_missing:${identity}`);
  const viewportPng = PNG.sync.read(await captureViewportPng(page));
  const scaleX = viewportPng.width / viewport.width;
  const scaleY = viewportPng.height / viewport.height;
  const left = Math.max(0, Math.floor(box.x * scaleX));
  const top = Math.max(0, Math.floor(box.y * scaleY));
  const right = Math.min(viewportPng.width, Math.ceil((box.x + box.width) * scaleX));
  const bottom = Math.min(viewportPng.height, Math.ceil((box.y + box.height) * scaleY));
  if (right <= left || bottom <= top) {
    throw new Error(`mobile_web_diagnostic_capture_outside_viewport:${identity}`);
  }
  const cropped = new PNG({ width: right - left, height: bottom - top });
  for (let row = 0; row < cropped.height; row += 1) {
    const sourceStart = ((top + row) * viewportPng.width + left) * 4;
    const targetStart = row * cropped.width * 4;
    viewportPng.data.copy(
      cropped.data,
      targetStart,
      sourceStart,
      sourceStart + cropped.width * 4,
    );
  }
  return PNG.sync.write(cropped);
}

async function captureViewportPng(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      format: "png",
      fromSurface: true,
    });
    return Buffer.from(result.data, "base64");
  } finally {
    await session.detach();
  }
}

function selectedValues(raw, allValues, defaults, label) {
  const requested = raw?.trim()
    ? raw.split(",").map((value) => value.trim()).filter(Boolean)
    : defaults;
  const values = requested.includes("all") ? [...allValues] : [...new Set(requested)];
  const missing = values.filter((value) => !allValues.includes(value));
  if (missing.length) throw new Error(`mobile_web_diagnostic_${label}_unknown:${missing.join(",")}`);
  if (!values.length) throw new Error(`mobile_web_diagnostic_${label}_empty`);
  return values;
}

export function mobileWebDiagnosticOutputRoot(value) {
  const resolved = value
    ? path.resolve(repositoryRoot, value)
    : path.join(repositoryRoot, "artifacts/verification/mobile-web-diagnostics");
  const relative = path.relative(repositoryRoot, resolved);
  if (!relative || path.isAbsolute(relative) || relative.startsWith(`..${path.sep}`) || relative === "..") {
    throw new Error("mobile_web_diagnostic_output_outside_repository");
  }
  return resolved;
}

export function mobileWebDiagnosticSelection(environment = process.env) {
  const assemblies = new Map(controlContract.pageAssemblyContracts.map((entry) => [entry.outcome, entry]));
  const outcomes = [...assemblies.keys()];
  const outcome = environment.STARWARD_WEB_DIAGNOSTIC_OUTCOME;
  if (!outcome || !assemblies.has(outcome)) {
    throw new Error(`mobile_web_diagnostic_outcome_unknown:${outcome ?? "missing"}`);
  }
  const assembly = assemblies.get(outcome);
  const controls = assembly.controlComposition.map((entry) => entry.stableControlId);
  const conditions = handoff.conditions.filter((entry) => entry.key.startsWith("mobile-android-"));
  const conditionKeys = conditions.map((entry) => entry.key);
  const selectedConditions = selectedValues(
    environment.STARWARD_WEB_DIAGNOSTIC_CONDITION,
    conditionKeys,
    ["mobile-android-390-full"],
    "condition",
  );
  const selectedModes = selectedValues(
    environment.STARWARD_WEB_DIAGNOSTIC_MODE,
    supportedModes,
    ["planning"],
    "mode",
  );
  const selectedControls = selectedValues(
    environment.STARWARD_WEB_DIAGNOSTIC_CONTROL,
    controls,
    controls,
    "control",
  );
  const population = [];
  for (const conditionKey of selectedConditions) {
    const condition = conditions.find((entry) => entry.key === conditionKey);
    for (const mode of selectedModes) {
      if (!condition.modes.includes(mode)) {
        throw new Error(`mobile_web_diagnostic_mode_not_covered:${conditionKey}:${mode}`);
      }
      population.push({
        condition,
        controls: selectedControls,
        mode,
        outcome,
        route: assembly.route,
        viewport: {
          width: Number(condition.viewport.width),
          height: Number(condition.viewport.height),
        },
      });
    }
  }
  return {
    outcome,
    population,
    outputRoot: mobileWebDiagnosticOutputRoot(environment.STARWARD_WEB_DIAGNOSTIC_OUTPUT),
  };
}

function referenceMode(mode) {
  return mode === "red-light" ? "red" : mode === "planning" ? "plan" : mode;
}

async function setProductionMode(page, baseURL, mode) {
  diagnosticProgress("production-mode-start", { mode });
  const profileUrl = new URL("/me", baseURL);
  const response = await page.goto(profileUrl.href, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`mobile_web_diagnostic_profile_unavailable:${response?.status() ?? "none"}`);
  await page.locator('[data-testid="screen-identity-profile-privacy"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="profile-open-appearance"]').click();
  await page.locator(`[data-testid=${JSON.stringify(appearanceModeTestIds[mode])}]`).click();
  diagnosticProgress("production-mode-complete", { mode });
}

function imageDimensions(buffer) {
  const image = PNG.sync.read(buffer);
  return { width: image.width, height: image.height };
}

function resizeNearest(source, width, height) {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y / height) * source.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      source.data.copy(target.data, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return target;
}

function diagnosticPixelMetrics(actualBuffer, referenceBuffer) {
  const actual = PNG.sync.read(actualBuffer);
  const reference = PNG.sync.read(referenceBuffer);
  const width = Math.max(1, Math.min(720, Math.max(actual.width, reference.width)));
  const height = Math.max(1, Math.min(1280, Math.max(actual.height, reference.height)));
  const left = resizeNearest(actual, width, height);
  const right = resizeNearest(reference, width, height);
  let delta = 0;
  let mismatch = 0;
  for (let index = 0; index < left.data.length; index += 4) {
    const red = Math.abs(left.data[index] - right.data[index]);
    const green = Math.abs(left.data[index + 1] - right.data[index + 1]);
    const blue = Math.abs(left.data[index + 2] - right.data[index + 2]);
    delta += red + green + blue;
    if (Math.max(red, green, blue) >= 32) mismatch += 1;
  }
  const pixels = width * height;
  return {
    compared_width: width,
    compared_height: height,
    mismatch_ratio: mismatch / pixels,
    normalized_difference: delta / (pixels * 3 * 255),
  };
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function relativeUrl(fromDirectory, target) {
  return path.relative(fromDirectory, target).replaceAll("\\", "/");
}

async function writeViewer(directory, report, pairs) {
  const rows = pairs.map((pair) => `
    <section>
      <h2>${htmlEscape(pair.label)}</h2>
      <div class="pair">
        <figure><figcaption>Production React Native Web</figcaption><img src="${htmlEscape(relativeUrl(directory, pair.actualPath))}"></figure>
        <figure><figcaption>Frozen selected target</figcaption><img src="${htmlEscape(relativeUrl(directory, pair.referencePath))}"></figure>
      </div>
      <pre>${htmlEscape(JSON.stringify(pair.metrics, null, 2))}</pre>
    </section>`).join("\n");
  const content = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Starward mobile Web design diagnostic</title>
<style>
body{margin:0;padding:24px;background:#111827;color:#f9fafb;font:14px/1.5 system-ui,sans-serif}
h1,h2{margin:0 0 12px}header,section{max-width:1500px;margin:0 auto 24px;padding:20px;background:#1f2937;border:1px solid #374151;border-radius:16px}
.warning{color:#fbbf24}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin-bottom:8px;color:#d1d5db}
img{display:block;max-width:100%;max-height:900px;object-fit:contain;background:#030712;border:1px solid #4b5563}
pre{overflow:auto;padding:12px;background:#030712;border-radius:8px}@media(max-width:800px){.pair{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Starward mobile Web selected-design diagnostic</h1>
<p class="warning">Diagnostic only — React Native Web does not prove Android native conformance.</p>
<pre>${htmlEscape(JSON.stringify(report.identity, null, 2))}</pre></header>
${rows}</body></html>`;
  const viewerPath = path.join(directory, "index.html");
  await writeFile(viewerPath, content, "utf8");
  return viewerPath;
}

async function captureReferencePages(browser, item) {
  diagnosticProgress("reference-capture-start", {
    condition: item.condition.key,
    mode: item.mode,
    outcome: item.outcome,
  });
  const context = await browser.newContext({
    locale: "zh-CN",
    reducedMotion: item.condition.motion === "reduced" ? "reduce" : "no-preference",
    viewport: item.viewport,
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(pageTargetPath).href, { waitUntil: "domcontentloaded" });
    diagnosticProgress("reference-document-ready", { outcome: item.outcome });
    await page.evaluate(({ mode, outcome }) => {
      const outcomeControl = Array.from(document.querySelectorAll("[data-outcome-id]"))
        .find((element) => element.getAttribute("data-outcome-id") === outcome);
      const modeControl = Array.from(document.querySelectorAll("[data-mode]"))
        .find((element) => element.getAttribute("data-mode") === mode);
      if (!(outcomeControl instanceof HTMLElement)) {
        throw new Error(`reference_outcome_control_missing:${outcome}`);
      }
      if (!(modeControl instanceof HTMLElement)) {
        throw new Error(`reference_mode_control_missing:${mode}`);
      }
      outcomeControl.click();
      modeControl.click();
    }, { mode: referenceMode(item.mode), outcome: item.outcome });
    diagnosticProgress("reference-selection-ready", { mode: item.mode, outcome: item.outcome });
    await page.addStyleTag({ content: `
      *,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}
      .device{width:${item.viewport.width}px!important;height:${item.viewport.height}px!important;max-width:none!important}
      .screen{width:100%!important;height:100%!important}
    ` });
    diagnosticProgress("reference-style-ready", { outcome: item.outcome });
    const screen = page.locator("#screen.screen").first();
    await screen.waitFor({ state: "visible" });
    diagnosticProgress("reference-screen-ready", { outcome: item.outcome });
    const pagePng = await captureVisibleLocator(page, screen, `${item.outcome}:page-reference`);
    diagnosticProgress("reference-page-captured", { outcome: item.outcome });

    const controls = new Map();
    for (const controlId of item.controls) {
      diagnosticProgress("reference-control-start", { control: controlId });
      const locator = page.locator(
        `[data-outcome=${JSON.stringify(item.outcome)}][data-control=${JSON.stringify(controlId)}]`,
      ).first();
      await locator.waitFor({ state: "visible" });
      controls.set(controlId, {
        locator: `[data-outcome=${JSON.stringify(item.outcome)}][data-control=${JSON.stringify(controlId)}]`,
        png: await captureVisibleLocator(page, locator, `${controlId}:reference`),
      });
      diagnosticProgress("reference-control-complete", { control: controlId });
    }
    diagnosticProgress("reference-capture-complete", {
      condition: item.condition.key,
      mode: item.mode,
      outcome: item.outcome,
    });
    return { controls, pagePng };
  } finally {
    await context.close();
  }
}

async function captureProductionPages(browser, baseURL, item) {
  diagnosticProgress("production-capture-start", {
    condition: item.condition.key,
    mode: item.mode,
    outcome: item.outcome,
  });
  const context = await browser.newContext({
    colorScheme: "dark",
    locale: "zh-CN",
    reducedMotion: item.condition.motion === "reduced" ? "reduce" : "no-preference",
    timezoneId: "Asia/Shanghai",
    viewport: item.viewport,
  });
  const page = await context.newPage();
  try {
    await setProductionMode(page, baseURL, item.mode);
    const target = new URL(item.route, baseURL);
    const response = await page.goto(target.href, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) throw new Error(`mobile_web_diagnostic_route_unavailable:${target.pathname}`);
    const screen = page.locator(`[data-testid=${JSON.stringify(`screen-${item.outcome}`)}]`).first();
    await screen.waitFor({ state: "visible" });
    await page.addStyleTag({ content: `
      *,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}
    ` });
    await page.waitForTimeout(500);
    const pagePng = await captureViewportPng(page);
    const controls = new Map();
    for (const controlId of item.controls) {
      diagnosticProgress("production-control-start", { control: controlId });
      const resolved = await productionControlLocator(page, controlId);
      const locator = resolved.locator;
      await locator.scrollIntoViewIfNeeded();
      await locator.waitFor({ state: "visible" });
      controls.set(controlId, {
        locator: resolved.selector,
        png: await captureVisibleLocator(page, locator, `${controlId}:production`),
      });
      diagnosticProgress("production-control-complete", { control: controlId });
    }
    diagnosticProgress("production-capture-complete", {
      condition: item.condition.key,
      mode: item.mode,
      outcome: item.outcome,
    });
    return { controls, pagePng, url: page.url() };
  } finally {
    await context.close();
  }
}

export async function runMobileWebDesignDiagnostic({ browser, baseURL, environment = process.env }) {
  if (!baseURL) throw new Error("mobile_web_diagnostic_base_url_missing");
  const selection = mobileWebDiagnosticSelection(environment);
  const reports = [];
  for (const item of selection.population) {
    diagnosticProgress("population-item-start", {
      condition: item.condition.key,
      controls: item.controls,
      mode: item.mode,
      outcome: item.outcome,
    });
    const directory = path.join(
      selection.outputRoot,
      item.outcome,
      item.condition.key,
      item.mode,
    );
    await mkdir(directory, { recursive: true });
    // Chromium serializes screenshots at the browser process boundary. Keeping
    // production and file:// reference capture concurrent can leave the second
    // context waiting behind an abandoned screenshot lock on Windows.
    const reference = await captureReferencePages(browser, item);
    const actual = await captureProductionPages(browser, baseURL, item);
    const pairs = [];
    const pageActualPath = path.join(directory, "page-actual.png");
    const pageReferencePath = path.join(directory, "page-reference.png");
    await Promise.all([
      writeFile(pageActualPath, actual.pagePng),
      writeFile(pageReferencePath, reference.pagePng),
    ]);
    pairs.push({
      label: `${item.outcome} page`,
      actualPath: pageActualPath,
      referencePath: pageReferencePath,
      metrics: {
        actual: imageDimensions(actual.pagePng),
        reference: imageDimensions(reference.pagePng),
        pixel: diagnosticPixelMetrics(actual.pagePng, reference.pagePng),
      },
    });
    for (const controlId of item.controls) {
      const actualCapture = actual.controls.get(controlId);
      const referenceCapture = reference.controls.get(controlId);
      if (!actualCapture || !referenceCapture) {
        throw new Error(`mobile_web_diagnostic_control_capture_missing:${controlId}`);
      }
      const actualPng = actualCapture.png;
      const referencePng = referenceCapture.png;
      const actualPath = path.join(directory, `${controlId}-actual.png`);
      const referencePath = path.join(directory, `${controlId}-reference.png`);
      await Promise.all([
        writeFile(actualPath, actualPng),
        writeFile(referencePath, referencePng),
      ]);
      pairs.push({
        label: controlId,
        actualPath,
        referencePath,
        locators: {
          production: actualCapture.locator,
          reference: referenceCapture.locator,
        },
        metrics: {
          actual: imageDimensions(actualPng),
          reference: imageDimensions(referencePng),
          pixel: diagnosticPixelMetrics(actualPng, referencePng),
        },
      });
    }
    const report = {
      schema_version: "starward-mobile-web-design-diagnostic-v1",
      authority: "diagnostic-only",
      native_proof: false,
      identity: {
        condition_key: item.condition.key,
        controls: item.controls,
        mode: item.mode,
        outcome: item.outcome,
        production_route: item.route,
        production_url: actual.url,
        selected_page_target: path.relative(repositoryRoot, pageTargetPath).replaceAll("\\", "/"),
        selected_control_target: path.relative(repositoryRoot, controlTargetPath).replaceAll("\\", "/"),
        viewport: item.viewport,
      },
      pairs: pairs.map((pair) => ({
        label: pair.label,
        actual_path: path.relative(repositoryRoot, pair.actualPath).replaceAll("\\", "/"),
        reference_path: path.relative(repositoryRoot, pair.referencePath).replaceAll("\\", "/"),
        ...(pair.locators ? { locators: pair.locators } : {}),
        metrics: pair.metrics,
      })),
    };
    const reportPath = path.join(directory, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    const viewerPath = await writeViewer(directory, report, pairs);
    reports.push({ reportPath, viewerPath, report });
    diagnosticProgress("population-item-complete", {
      condition: item.condition.key,
      mode: item.mode,
      outcome: item.outcome,
      report: reportPath,
      viewer: viewerPath,
    });
  }
  return reports;
}

export {
  pageCoverage,
  controlContract,
  repositoryRoot,
  supportedModes,
};
