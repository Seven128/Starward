import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect } from "@playwright/test";
import { PNG } from "pngjs";
import {
  applicableControlStates,
  assertExactContractPopulation,
  assertExactRuntimeFieldWitnesses,
  assertExactRuntimeProfileWitnesses,
  assertScenarioTrace,
  assertStateTrace,
  designWitnessCorroboration,
  parseStructuredEvidenceValue,
} from "../../../tools/long-task/design-contract-proof.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const opsPageCoverage = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/design-targets/ops-product-pages-v1/coverage-manifest.json"),
  "utf8",
));
const opsControlContract = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/design-targets/ops-controls-v2/implementation-contract.json"),
  "utf8",
));
const opsContractPopulation = assertExactContractPopulation("ops", opsControlContract);
const opsDesignSessionId = process.env.STARWARD_DESIGN_ACCEPTANCE_RUN_ID ?? "missing-design-session";
const routeByOutcome = Object.freeze({
  "admin-data-operations": "data-operations",
  "quality-release-observability": "release-quality",
});
const apiRouteByOutcome = Object.freeze({
  "admin-data-operations": { read: "/v1/admin/data-status", write: "/v1/admin/commands" },
  "quality-release-observability": { read: "/v1/quality", write: "/v1/quality/commands" },
});
const referenceEntryByTargetPrefix = Object.freeze({
  "ops-page-constraint-": "docs/design-targets/ops-product-pages-v1/index.html",
  "ops-control-exact-": "docs/design-targets/ops-controls-v2/index.html",
});
const acquisitionCache = new Map();
const methodValidationCache = new Map();
const exactVisualThreshold = 0.035;
const constraintVisualThreshold = 0.07;
const exactMismatchThreshold = 0.12;
const constraintMismatchThreshold = 0.22;
const exactEdgeThreshold = 0.05;
const constraintEdgeThreshold = 0.09;
const visibleChangeThreshold = 0.004;
const geometryTolerancePx = 3;
const controlRatioTolerance = 0.04;

function opsAcceptanceHeaders(condition, outcome) {
  return {
    authorization: `Bearer ${process.env.STARWARD_OPS_ACCEPTANCE_ACCESS_TOKEN ?? "missing"}`,
    "x-starward-design-condition": condition.key,
    "x-starward-design-mode": condition.motion,
    "x-starward-design-outcome": outcome,
    "x-starward-design-session": opsDesignSessionId,
  };
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function outcomeAssemblies(outcome) {
  const assemblies = opsPageCoverage.routes.filter((route) => route.outcomes.includes(outcome));
  if (!assemblies.length) throw new Error(`ops_page_assembly_population_missing:${outcome}`);
  return assemblies;
}

function controlAssembly(outcome, controlId) {
  const assembly = outcomeAssemblies(outcome).find((route) => route.controls.includes(controlId));
  if (!assembly) throw new Error(`ops_control_assembly_missing:${outcome}:${controlId}`);
  return assembly;
}

function targetKind(target) {
  if (target.key.startsWith("ops-page-constraint-")) return "page";
  if (target.key.startsWith("ops-control-exact-")) return "control";
  return "authority-reference";
}

function artifactPaths(outcome, targetKey) {
  const directory = path.join(repositoryRoot, "artifacts", "verification", "design-conformance", outcome);
  return {
    directory,
    actual: path.join(directory, `${targetKey}-actual.png`),
    actualRelative: `artifacts/verification/design-conformance/${outcome}/${targetKey}-actual.png`,
    comparison: path.join(directory, `${targetKey}-comparison.png`),
    comparisonRelative: `artifacts/verification/design-conformance/${outcome}/${targetKey}-comparison.png`,
  };
}

function resizeImage(source, width, height) {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      source.data.copy(target.data, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
  return target;
}

export function pixelDifferenceMetrics(actual, comparison) {
  const decodedLeft = PNG.sync.read(actual);
  const decodedRight = PNG.sync.read(comparison);
  const width = Math.max(1, Math.min(720, Math.max(decodedLeft.width, decodedRight.width)));
  const height = Math.max(1, Math.min(1280, Math.max(decodedLeft.height, decodedRight.height)));
  const left = resizeImage(decodedLeft, width, height);
  const right = resizeImage(decodedRight, width, height);
  let delta = 0;
  let mismatch = 0;
  let edgeDelta = 0;
  const pixels = width * height;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const index = pixel * 4;
    const red = Math.abs(left.data[index] - right.data[index]);
    const green = Math.abs(left.data[index + 1] - right.data[index + 1]);
    const blue = Math.abs(left.data[index + 2] - right.data[index + 2]);
    delta += red + green + blue;
    if (Math.max(red, green, blue) >= 32) mismatch += 1;
    if (pixel >= width) {
      const above = index - width * 4;
      const leftEdge = Math.abs(left.data[index] - left.data[above])
        + Math.abs(left.data[index + 1] - left.data[above + 1])
        + Math.abs(left.data[index + 2] - left.data[above + 2]);
      const rightEdge = Math.abs(right.data[index] - right.data[above])
        + Math.abs(right.data[index + 1] - right.data[above + 1])
        + Math.abs(right.data[index + 2] - right.data[above + 2]);
      edgeDelta += Math.abs(leftEdge - rightEdge);
    }
  }
  return {
    compared_height: height,
    compared_width: width,
    edge_difference: edgeDelta / (Math.max(1, pixels - width) * 3 * 255),
    mismatch_ratio: mismatch / pixels,
    normalized_difference: delta / (pixels * 3 * 255),
  };
}

function containedImage(buffer, width = 320, height = 240) {
  const source = PNG.sync.read(buffer);
  const scale = Math.min(width / source.width, height / source.height);
  const rendered = resizeImage(source, Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)));
  const target = new PNG({ width, height });
  target.data.fill(31);
  for (let alpha = 3; alpha < target.data.length; alpha += 4) target.data[alpha] = 255;
  const offsetX = Math.floor((width - rendered.width) / 2);
  const offsetY = Math.floor((height - rendered.height) / 2);
  for (let y = 0; y < rendered.height; y += 1) {
    const sourceStart = y * rendered.width * 4;
    const targetStart = ((y + offsetY) * width + offsetX) * 4;
    rendered.data.copy(target.data, targetStart, sourceStart, sourceStart + rendered.width * 4);
  }
  return target;
}

function montage(buffers, columns = 3) {
  if (!buffers.length) throw new Error("ops_design_montage_empty");
  const cellWidth = 320;
  const cellHeight = 240;
  const rows = Math.ceil(buffers.length / columns);
  const target = new PNG({ width: cellWidth * columns, height: cellHeight * rows });
  target.data.fill(31);
  for (let alpha = 3; alpha < target.data.length; alpha += 4) target.data[alpha] = 255;
  buffers.forEach((buffer, index) => {
    const cell = containedImage(buffer, cellWidth, cellHeight);
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (let y = 0; y < cellHeight; y += 1) {
      const sourceStart = y * cellWidth * 4;
      const targetStart = ((row * cellHeight + y) * target.width + column * cellWidth) * 4;
      cell.data.copy(target.data, targetStart, sourceStart, sourceStart + cellWidth * 4);
    }
  });
  return PNG.sync.write(target);
}

function computedStyleSnapshot(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      color: style.color,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      boxShadow: style.boxShadow,
      columnGap: style.columnGap,
      gap: style.gap,
      height: style.height,
      maxHeight: style.maxHeight,
      maxWidth: style.maxWidth,
      minHeight: style.minHeight,
      minWidth: style.minWidth,
      opacity: style.opacity,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      paddingTop: style.paddingTop,
      rowGap: style.rowGap,
      textDecorationLine: style.textDecorationLine,
      transform: style.transform,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      width: style.width,
    };
  });
}

async function runtimeDesignWitnesses(locator) {
  return locator.locator('script[type="application/json"][data-starward-design-witness]').evaluateAll((nodes) =>
    nodes.map((node) => {
      try {
        return JSON.parse(node.textContent ?? "");
      } catch {
        throw new Error("ops_runtime_design_witness_json_invalid");
      }
    }));
}

async function describeLocator(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("ops_design_locator_bounds_missing");
  const assets = await locator.evaluate((element) => ({
    identities: [...element.querySelectorAll("[data-asset-identity],[id]")].flatMap((node) => [
      node.getAttribute("data-asset-identity"),
      node.id ? `#${node.id}` : null,
    ]).filter(Boolean),
    media: [...element.querySelectorAll("img,video,picture,source")].map((node) =>
      node.getAttribute("src") ?? node.getAttribute("srcset") ?? node.tagName.toLowerCase()),
  }));
  const semantic = await locator.evaluate((element) => ({
    ariaBusy: element.getAttribute("aria-busy"),
    ariaChecked: element.getAttribute("aria-checked"),
    ariaDisabled: element.getAttribute("aria-disabled"),
    ariaExpanded: element.getAttribute("aria-expanded"),
    ariaLabel: element.getAttribute("aria-label"),
    ariaPressed: element.getAttribute("aria-pressed"),
    ariaSelected: element.getAttribute("aria-selected"),
    contractState: element.getAttribute("data-contract-state"),
    state: element.getAttribute("data-state"),
    role: element.getAttribute("role") ?? (element instanceof HTMLButtonElement ? "button" : element.tagName.toLowerCase()),
    tag: element.tagName.toLowerCase(),
  }));
  return {
    assets,
    box,
    semantic,
    style: await computedStyleSnapshot(locator),
    text: ((await locator.innerText().catch(() => "")) ?? "").trim(),
    runtimeWitnesses: await runtimeDesignWitnesses(locator),
  };
}

async function visibleControl(page, controlId) {
  const candidates = page.locator(`[data-control=${JSON.stringify(controlId)}]`);
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error(`ops_production_control_missing:${controlId}`);
}

async function productionRoot(page, baseURL, outcome, assemblyId = routeByOutcome[outcome]) {
  const assembly = outcomeAssemblies(outcome).find((candidate) => candidate.id === assemblyId);
  if (!assembly) throw new Error(`ops_page_assembly_missing:${outcome}:${assemblyId}`);
  const route = `/${assembly.id}`;
  const response = await page.goto(new URL("/", baseURL).href, { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL((url) => url.origin === new URL(baseURL).origin && !url.searchParams.has("acceptanceFixture"));
  const shell = page.locator("[data-testid=screen-owner-operations-root]").first();
  await expect(shell).toBeVisible();
  const entry = shell.locator(`[data-testid=${JSON.stringify(`owner-ops-nav-${assembly.id}`)}]`).first();
  await expect(entry).toBeVisible();
  await entry.click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL((url) => url.pathname === route && !url.searchParams.has("acceptanceFixture"));
  const screen = page.locator(`[data-testid=${JSON.stringify(`screen-ops-assembly-${assembly.id}`)}]`).first();
  await expect(screen).toBeVisible();
  return screen;
}

async function captureReferencePage(reference, route) {
  await reference.locator(`[data-route=${JSON.stringify(route)}]`).first().click();
  const root = reference.locator(`[data-route-page=${JSON.stringify(route)}]`).first();
  await root.waitFor({ state: "visible" });
  return root;
}

async function captureReferenceControl(reference, outcome, controlId) {
  const root = reference.locator(
    `[data-outcome=${JSON.stringify(outcome)}][data-control=${JSON.stringify(controlId)}][data-specimen]`,
  ).first();
  await root.waitFor({ state: "visible" });
  await root.scrollIntoViewIfNeeded();
  return root.locator("[data-render-root]").first();
}

async function captureTargetSamples({ browser, baseURL, conditions, controlContracts, controls, outcome, target }) {
  const kind = targetKind(target);
  const paths = artifactPaths(outcome, target.key);
  await mkdir(paths.directory, { recursive: true });
  const samples = [];
  const actualBuffers = [];
  const comparisonBuffers = [];
  const effectiveConditions = kind === "authority-reference" && !conditions.length
    ? [{ key: "ops-web-1440-reduced", viewport: { width: 1440, height: 900 }, motion: "reduced" }]
    : conditions;
  for (const condition of effectiveConditions) {
    const viewport = { width: Number(condition.viewport?.width ?? 1440), height: Number(condition.viewport?.height ?? 900) };
    const context = await browser.newContext({
      viewport,
      locale: "zh-CN",
      reducedMotion: condition.motion === "reduced" ? "reduce" : "no-preference",
      extraHTTPHeaders: opsAcceptanceHeaders(condition, outcome),
    });
    const referenceContext = await browser.newContext({
      viewport,
      locale: "zh-CN",
      reducedMotion: condition.motion === "reduced" ? "reduce" : "no-preference",
    });
    try {
      const actualPage = await context.newPage();
      const referencePage = await referenceContext.newPage();
      const referenceEntry = referenceEntryByTargetPrefix[Object.keys(referenceEntryByTargetPrefix)
        .find((prefix) => target.key.startsWith(prefix))];
      if (kind === "authority-reference") {
        const sourcePath = target.key === "design-authority-reference" ? "DESIGN.md" : "docs/source-plan.md";
        const source = await readFile(path.join(repositoryRoot, sourcePath), "utf8");
        await referencePage.setContent(`<main style="font:16px/1.5 system-ui;white-space:pre-wrap;padding:32px">${source
          .replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</main>`);
        for (const assembly of outcomeAssemblies(outcome)) {
          const actualRoot = await productionRoot(actualPage, baseURL, outcome, assembly.id);
          const assemblyControls = assembly.controls.filter((controlId) => controls.includes(controlId));
          const actualControls = {};
          for (const controlId of assemblyControls) {
            actualControls[controlId] = await describeLocator(await visibleControl(actualPage, controlId));
          }
          const actualPng = await actualRoot.screenshot({ animations: "disabled" });
          const comparisonPng = await referencePage.locator("main").screenshot({ animations: "disabled" });
          samples.push({
            actualControls,
            actualControlOrder: await actualRoot.locator("[data-control]").evaluateAll((nodes) =>
              [...new Set(nodes.map((node) => node.getAttribute("data-control")).filter(Boolean))]),
            actualPng,
            assemblyControls,
            assemblyId: assembly.id,
            comparisonPng,
            condition,
            kind,
            viewport,
          });
          actualBuffers.push(actualPng);
          comparisonBuffers.push(comparisonPng);
        }
        continue;
      }
      await referencePage.goto(pathToFileURL(path.join(repositoryRoot, referenceEntry)).href, { waitUntil: "load" });
      await referencePage.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important}" });
      if (kind === "page") {
        for (const assembly of outcomeAssemblies(outcome)) {
          const actualRoot = await productionRoot(actualPage, baseURL, outcome, assembly.id);
          const referenceRoot = await captureReferencePage(referencePage, assembly.id);
          const actualRootBox = await actualRoot.boundingBox();
          const referenceRootBox = await referenceRoot.boundingBox();
          if (!actualRootBox || !referenceRootBox) {
            throw new Error(`ops_page_root_geometry_missing:${outcome}:${assembly.id}:${condition.key}`);
          }
          const actualPng = await actualRoot.screenshot({ animations: "disabled" });
          const comparisonPng = await referenceRoot.screenshot({ animations: "disabled" });
          const assemblyControls = assembly.controls.filter((controlId) => controls.includes(controlId));
          const actualControls = {};
          const referenceControls = {};
          for (const controlId of assemblyControls) {
            actualControls[controlId] = await describeLocator(await visibleControl(actualPage, controlId));
            const referenceControl = referenceRoot.locator(`[data-control=${JSON.stringify(controlId)}]`).first();
            await referenceControl.waitFor({ state: "visible" });
            referenceControls[controlId] = await describeLocator(referenceControl);
          }
          samples.push({
            actualControls,
            actualPng,
            actualRootBox,
            assemblyControls,
            assemblyId: assembly.id,
            comparisonPng,
            condition,
            kind,
            profileSampleId: `${condition.key}-${outcome}-${assembly.id}`,
            profileWitnesses: await runtimeDesignWitnesses(actualRoot),
            referenceControls,
            referenceRootBox,
            sessionId: opsDesignSessionId,
            viewport,
          });
          actualBuffers.push(actualPng);
          comparisonBuffers.push(comparisonPng);
        }
      } else {
        for (const controlId of controls) {
          const assemblyId = controlAssembly(outcome, controlId).id;
          const actualRoot = await productionRoot(actualPage, baseURL, outcome, assemblyId);
          const actualControl = await visibleControl(actualPage, controlId);
          const referenceControl = await captureReferenceControl(referencePage, outcome, controlId);
          const actualPng = await actualControl.screenshot({ animations: "disabled" });
          const comparisonPng = await referenceControl.screenshot({ animations: "disabled" });
          samples.push({
            actual: await describeLocator(actualControl),
            actualPng,
            comparison: await describeLocator(referenceControl),
            comparisonPng,
            condition,
            contract: controlContracts.get(controlId),
            controlId,
            kind,
            mode: condition.motion,
            profileSampleId: `${condition.key}-${outcome}-${assemblyId}`,
            profileWitnesses: await runtimeDesignWitnesses(actualRoot),
            sampleId: `${condition.key}-${outcome}-${controlId}`,
            sessionId: opsDesignSessionId,
            viewport,
          });
          actualBuffers.push(actualPng);
          comparisonBuffers.push(comparisonPng);
        }
      }
    } finally {
      await Promise.all([context.close(), referenceContext.close()]);
    }
  }
  const actual = montage(actualBuffers);
  const comparison = montage(comparisonBuffers);
  await Promise.all([writeFile(paths.actual, actual), writeFile(paths.comparison, comparison)]);
  return { actual, comparison, kind, outcome, paths, samples, target };
}

function acquisition(input) {
  const key = `${input.baseURL}|${input.outcome}|${input.target.key}`;
  if (!acquisitionCache.has(key)) acquisitionCache.set(key, captureTargetSamples(input));
  return acquisitionCache.get(key);
}

export function assertConditionCoverage(target, conditions) {
  if (targetKind(target) === "authority-reference") {
    if (JSON.stringify(target.condition_refs) !== JSON.stringify(["reference-authority"])) {
      throw new Error(`ops_reference_condition_invalid:${target.key}`);
    }
    return;
  }
  const expected = [...target.condition_refs].sort();
  const actual = conditions.map((condition) => condition.key).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`ops_condition_matrix_mismatch:${target.key}`);
}

function validateCoverage(target, method, rows, conditions) {
  assertConditionCoverage(target, conditions);
  if (!rows.length) throw new Error(`ops_design_coverage_missing:${target.key}:${method}`);
  for (const row of rows) {
    if (!row.source_item_refs?.length || !row.condition_refs?.length || !row.evidence_refs?.length) {
      throw new Error(`ops_design_row_attribution_incomplete:${row.key}`);
    }
    if (method !== "conformance" && !row.verification_methods.includes(method)) {
      throw new Error(`ops_design_row_method_mismatch:${row.key}:${method}`);
    }
  }
}

function validateVisual(artifact) {
  const threshold = artifact.target.interpretation === "exact_target" ? exactVisualThreshold : constraintVisualThreshold;
  const mismatchThreshold = artifact.target.interpretation === "exact_target"
    ? exactMismatchThreshold
    : constraintMismatchThreshold;
  const edgeThreshold = artifact.target.interpretation === "exact_target" ? exactEdgeThreshold : constraintEdgeThreshold;
  for (const sample of artifact.samples) {
    if (sample.kind === "authority-reference") continue;
    const metrics = pixelDifferenceMetrics(sample.actualPng, sample.comparisonPng);
    if (metrics.normalized_difference > threshold
      || metrics.mismatch_ratio > mismatchThreshold
      || metrics.edge_difference > edgeThreshold) {
      throw new Error(`ops_visual_difference_exceeded:${artifact.target.key}:${sample.condition.key}:${sample.controlId ?? "page"}`);
    }
  }
}

function validateGeometry(artifact, controls) {
  for (const sample of artifact.samples) {
    if (sample.kind === "authority-reference") continue;
    if (sample.kind === "control") {
      const actualRatio = sample.actual.box.width / sample.actual.box.height;
      const comparisonRatio = sample.comparison.box.width / sample.comparison.box.height;
      if (sample.actual.box.width < 44 || sample.actual.box.height < 44) throw new Error(`ops_touch_target_too_small:${sample.controlId}`);
      if (Math.abs(Math.log(actualRatio / comparisonRatio)) > controlRatioTolerance
        || Math.abs(sample.actual.box.width - sample.comparison.box.width) > geometryTolerancePx
        || Math.abs(sample.actual.box.height - sample.comparison.box.height) > geometryTolerancePx) {
        throw new Error(`ops_control_geometry_mismatch:${sample.controlId}:${sample.condition.key}`);
      }
      continue;
    }
    for (const controlId of sample.assemblyControls ?? controls) {
      const actual = sample.actualControls[controlId]?.box;
      const comparison = sample.referenceControls[controlId]?.box;
      if (!actual || !comparison) throw new Error(`ops_page_control_geometry_missing:${controlId}`);
      if (actual.width < 44 || actual.height < 44) throw new Error(`ops_touch_target_too_small:${controlId}`);
      const actualRect = [
        actual.x - sample.actualRootBox.x,
        actual.y - sample.actualRootBox.y,
        actual.width,
        actual.height,
      ];
      const comparisonRect = [
        comparison.x - sample.referenceRootBox.x,
        comparison.y - sample.referenceRootBox.y,
        comparison.width,
        comparison.height,
      ];
      if (actualRect.some((value, index) => Math.abs(value - comparisonRect[index]) > geometryTolerancePx)) {
        throw new Error(`ops_page_control_geometry_mismatch:${controlId}:${sample.condition.key}`);
      }
    }
    if (JSON.stringify(sample.actualControlOrder) !== JSON.stringify(sample.assemblyControls)) {
      throw new Error(`ops_page_control_order_mismatch:${sample.assemblyId}:${sample.condition.key}`);
    }
  }
}

function contractAccessibleName(contract) {
  return contract?.accessibility?.web?.name
    ?? contract?.accessibility?.name
    ?? contract?.contentLocalization?.label
    ?? "";
}

function validateAccessibility(artifact, controls, controlContracts) {
  for (const controlId of controls) {
    const relevant = artifact.samples.filter((sample) =>
      sample.controlId === controlId || sample.kind === "page" || sample.kind === "authority-reference");
    for (const sample of relevant) {
      const actual = sample.kind === "control" ? sample.actual : sample.actualControls?.[controlId];
      if (!actual) continue;
      if (actual.box.width < 44 || actual.box.height < 44) throw new Error(`ops_touch_target_too_small:${controlId}`);
      const semanticName = actual.semantic.ariaLabel || actual.text;
      if (!semanticName) throw new Error(`ops_accessible_name_missing:${controlId}`);
      const expected = contractAccessibleName(controlContracts.get(controlId));
      if (expected && !semanticName.includes(expected)) {
        throw new Error(`ops_accessible_name_mismatch:${controlId}`);
      }
      if (!["button", "link", "tab", "checkbox", "switch", "region", "section"].includes(actual.semantic.role)) {
        throw new Error(`ops_accessible_role_missing:${controlId}`);
      }
    }
  }
}

function validateContent(artifact, controls, controlContracts) {
  for (const controlId of controls) {
    const contract = controlContracts.get(controlId);
    const expected = contract?.contentLocalization?.label ?? contract?.accessibility?.name;
    if (!expected) throw new Error(`ops_control_content_contract_missing:${controlId}`);
    for (const sample of artifact.samples.filter((value) =>
      value.controlId === controlId
      || ((value.kind === "page" || value.kind === "authority-reference")
        && value.assemblyControls?.includes(controlId)))) {
      const text = sample.kind === "control" ? sample.actual.text : sample.actualControls?.[controlId]?.text;
      if (!text || !text.includes(expected)) {
        throw new Error(`ops_control_content_mismatch:${controlId}:${sample.condition.key}`);
      }
    }
  }
}

function cssColor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const hex = /^#([\da-f]{6})$/u.exec(normalized);
  if (!hex) return normalized.replace(/\s+/gu, "");
  const integer = Number.parseInt(hex[1], 16);
  return `rgb(${(integer >> 16) & 255},${(integer >> 8) & 255},${integer & 255})`;
}

function cssFamily(value) {
  return String(value ?? "").toLowerCase().replace(/["']/gu, "").replace(/\s+/gu, " ").trim();
}

function cssScalar(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^0(?:\.0+)?(?:px|em|rem)?$/u.test(normalized) ? "0" : normalized;
}

function normalizedStyleValue(field, value) {
  if (/color/iu.test(field)) return cssColor(value);
  if (field === "fontFamily") return cssFamily(value);
  return cssScalar(value);
}

function validateDesignTokens(artifact, controls, controlContracts) {
  for (const controlId of controls) {
    const contract = controlContracts.get(controlId);
    const expectedRadius = contract?.visual?.radius?.resolved;
    const expectedBorder = contract?.visual?.border?.resolved;
    const expectedBorderWidth = contract?.visual?.border?.widthPx;
    const expectedBorderStyle = contract?.visual?.border?.style;
    const expectedBackground = contract?.visual?.background?.resolved;
    const expectedForeground = contract?.visual?.foreground?.resolved;
    const expectedTypography = contract?.visual?.typography?.resolved;
    for (const sample of artifact.samples.filter((value) =>
      value.controlId === controlId || value.kind === "page" || value.kind === "authority-reference")) {
      const style = sample.kind === "control" ? sample.actual.style : sample.actualControls?.[controlId]?.style;
      const comparisonStyle = sample.kind === "control"
        ? sample.comparison?.style
        : sample.referenceControls?.[controlId]?.style;
      if (!style) continue;
      if (expectedRadius && style.borderRadius !== expectedRadius) throw new Error(`ops_design_token_radius_mismatch:${controlId}`);
      if (expectedBorder && cssColor(style.borderColor) !== cssColor(expectedBorder)) {
        throw new Error(`ops_design_token_border_mismatch:${controlId}`);
      }
      if (expectedBorderWidth !== undefined && style.borderWidth !== `${expectedBorderWidth}px`) {
        throw new Error(`ops_design_token_border_width_mismatch:${controlId}`);
      }
      if (expectedBorderStyle && style.borderStyle !== expectedBorderStyle) {
        throw new Error(`ops_design_token_border_style_mismatch:${controlId}`);
      }
      if (expectedBackground && cssColor(style.backgroundColor) !== cssColor(expectedBackground)) {
        throw new Error(`ops_design_token_background_mismatch:${controlId}`);
      }
      if (expectedForeground && cssColor(style.color) !== cssColor(expectedForeground)) {
        throw new Error(`ops_design_token_foreground_mismatch:${controlId}`);
      }
      if (expectedTypography) {
        if (!cssFamily(style.fontFamily).includes(cssFamily(expectedTypography.fontFamily).split(",")[0])) {
          throw new Error(`ops_design_token_font_family_mismatch:${controlId}`);
        }
        for (const [field, expected] of [
          ["fontSize", expectedTypography.fontSize],
          ["fontWeight", String(expectedTypography.fontWeight)],
          ["letterSpacing", expectedTypography.letterSpacing],
          ["lineHeight", expectedTypography.lineHeight],
        ]) {
          if (expected !== undefined && cssScalar(style[field]) !== cssScalar(expected)) {
            throw new Error(`ops_design_token_${field}_mismatch:${controlId}`);
          }
        }
      }
      if (!style.color || !style.fontSize || !style.fontFamily) throw new Error(`ops_design_token_unobservable:${controlId}`);
      if (comparisonStyle) {
        for (const field of [
          "backgroundColor",
          "borderColor",
          "borderRadius",
          "borderStyle",
          "borderWidth",
          "boxShadow",
          "color",
          "columnGap",
          "fontFamily",
          "fontSize",
          "fontWeight",
          "gap",
          "letterSpacing",
          "lineHeight",
          "opacity",
          "paddingBottom",
          "paddingLeft",
          "paddingRight",
          "paddingTop",
          "rowGap",
          "textDecorationLine",
          "transform",
        ]) {
          if (normalizedStyleValue(field, style[field]) !== normalizedStyleValue(field, comparisonStyle[field])) {
            throw new Error(`ops_computed_design_token_${field}_mismatch:${controlId}:${sample.condition.key}`);
          }
        }
      }
    }
  }
}

function validateResponsive(artifact, controls) {
  const expected = ["ops-web-1024-full", "ops-web-1180-full", "ops-web-1440-full", "ops-web-1440-reduced", "ops-web-820-full"];
  const actual = [...new Set(artifact.samples.map((sample) => sample.condition.key))].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`ops_responsive_conditions_incomplete:${artifact.target.key}`);
  if (artifact.kind === "page") {
    const expectedAssemblies = outcomeAssemblies(artifact.outcome).map((assembly) => assembly.id).sort();
    for (const condition of expected) {
      const actualAssemblies = [...new Set(artifact.samples
        .filter((sample) => sample.condition.key === condition)
        .map((sample) => sample.assemblyId))].sort();
      if (JSON.stringify(actualAssemblies) !== JSON.stringify(expectedAssemblies)) {
        throw new Error(`ops_page_assembly_coverage_incomplete:${artifact.outcome}:${condition}`);
      }
    }
  }
  for (const sample of artifact.samples) {
    const values = sample.kind === "control"
      ? [[sample.controlId, sample.actual.box]]
      : (sample.assemblyControls ?? controls).map((control) => [control, sample.actualControls[control]?.box]);
    for (const [controlId, box] of values) {
      if (!box || box.x < 0 || box.x + box.width > sample.viewport.width + 1) throw new Error(`ops_control_overflow:${controlId}:${sample.condition.key}`);
    }
  }
}

function validateAssets(artifact, controls, controlContracts) {
  if (artifact.kind !== "control") return;
  for (const controlId of controls) {
    const assets = controlContracts.get(controlId)?.assets;
    if (!assets || !["explicit-none", "declared"].includes(assets.status)) throw new Error(`ops_asset_contract_unresolved:${controlId}`);
    const samples = artifact.samples.filter((sample) => sample.controlId === controlId);
    if (!samples.length) throw new Error(`ops_asset_runtime_sample_missing:${controlId}`);
    if (assets.status === "explicit-none" && samples.some((sample) => sample.actual.assets.media.length > 0)) {
      throw new Error(`ops_undeclared_runtime_media_present:${controlId}`);
    }
    if (assets.status === "declared") {
      for (const item of assets.items ?? []) {
        if (!item.identifierOrPath || !item.license || /unknown|unverified|placeholder/iu.test(item.license)) {
          throw new Error(`ops_asset_identity_or_license_missing:${controlId}`);
        }
        if (samples.some((sample) => !sample.actual.assets.identities.includes(item.identifierOrPath))) {
          throw new Error(`ops_asset_runtime_identity_missing:${controlId}:${item.identifierOrPath}`);
        }
      }
    }
  }
}

async function validateInputAndFocus(browser, baseURL, outcome, controls, controlContracts, artifact) {
  const conditionByKey = new Map(artifact.samples.map((sample) => [sample.condition.key, sample.condition]));
  for (const condition of conditionByKey.values()) {
    const context = await browser.newContext({
      viewport: {
        width: Number(condition.viewport?.width ?? 1440),
        height: Number(condition.viewport?.height ?? 900),
      },
      locale: "zh-CN",
      reducedMotion: condition.motion === "reduced" ? "reduce" : "no-preference",
      extraHTTPHeaders: opsAcceptanceHeaders(condition, outcome),
    });
    try {
      const page = await context.newPage();
      for (const controlId of controls) {
        await productionRoot(page, baseURL, outcome, controlAssembly(outcome, controlId).id);
        await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
        if (!await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)) {
          throw new Error(`ops_document_overflow_at_200_percent:${outcome}:${condition.key}`);
        }
        const control = await visibleControl(page, controlId);
        const nested = control.locator("button,[role=button],[role=tab],[role=switch],a[href],input,select,textarea").first();
        const interactive = await nested.count() ? nested : control;
        await interactive.focus();
        await expect(interactive).toBeFocused();
        const style = await computedStyleSnapshot(interactive);
        const focus = controlContracts.get(controlId)?.visual?.focus;
        if (focus) {
          if (style.outlineWidth !== focus.outline?.split(/\s+/u)[0]
            || style.outlineStyle === "none"
            || style.outlineOffset !== `${focus.offsetPx}px`
            || cssColor(style.outlineColor) !== cssColor(focus.tokenId ? focus.resolved ?? "#1677ff" : focus.resolved)) {
            throw new Error(`ops_focus_indicator_mismatch:${controlId}:${condition.key}`);
          }
        }
        await page.keyboard.press("Enter");
        await page.keyboard.press("Escape");
      }
    } finally {
      await context.close();
    }
  }
}

async function assertAnonymousDenied(baseURL, outcome) {
  for (const route of Object.values(apiRouteByOutcome[outcome])) {
    const response = await fetch(new URL(route, baseURL), {
      method: route.endsWith("commands") ? "POST" : "GET",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: route.endsWith("commands") ? JSON.stringify({ command: "unauthorized-probe" }) : undefined,
    });
    if (![401, 403].includes(response.status)) throw new Error(`ops_anonymous_request_not_denied:${route}:${response.status}`);
  }
}

function nestedProofValue(value, aliases, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = nestedProofValue(item, aliases, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  for (const [key, item] of Object.entries(value)) {
    if (aliases.has(key.toLowerCase()) && item !== null && item !== undefined && item !== "") return item;
  }
  for (const item of Object.values(value)) {
    const found = nestedProofValue(item, aliases, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function responseProof(headers, body) {
  const field = (header, aliases) => headers[header]
    ?? nestedProofValue(body, new Set(aliases.map((alias) => alias.toLowerCase())));
  return {
    actor: field("x-starward-actor-id", ["actorId", "actor", "subjectId"]),
    audit: field("x-starward-audit-id", ["auditId", "audit", "auditReference"]),
    confirmation: field("x-starward-confirmation-id", ["confirmation", "confirmationId", "confirmationMethod"]),
    failure: field("x-starward-failure-id", ["failure", "failureEvidence", "errorPath"]),
    idempotency: field("x-starward-idempotency-key", ["idempotencyKey", "idempotency"]),
    impact: field("x-starward-impact-id", ["impact", "impactPreview"]),
    operation: field("x-starward-operation-id", ["operationId", "operation"]),
    permission: field("x-starward-permission-id", ["permission", "authorization", "role"]),
    readback: field("x-starward-readback-id", ["readback", "committedState", "effectiveVersion"]),
    reauth: field("x-starward-reauth-id", ["reauthentication", "reauth", "mfa", "mfaVerified"]),
    recovery: field("x-starward-recovery-id", ["recoveryId", "recovery", "rollback", "rollbackPoint"]),
    redaction: field("x-starward-redaction-id", ["redaction", "redacted", "redactionPolicy"]),
    retry: field("x-starward-retry-id", ["retry", "retryEvidence", "retryCount"]),
    scenario: field("x-starward-acceptance-scenario", ["acceptanceScenarioId", "scenarioId"]),
    session: field("x-starward-session-id", ["sessionId", "session"]),
    source: field("x-starward-source-id", ["dataSource", "source", "provenance"]),
    telemetry: field("x-starward-telemetry-id", ["telemetry", "correlationId", "traceId"]),
    timeout: field("x-starward-timeout-id", ["timeout", "timeoutEvidence", "timeoutPolicy"]),
  };
}

function scenarioPolicy(contract, scenario) {
  const tag = String(scenario.coverageTag ?? "").toLowerCase();
  const text = `${scenario.given ?? ""} ${scenario.when ?? ""} ${scenario.then ?? ""}`.toLowerCase();
  return {
    blockedWithoutWrite: /blocker|blocked|pause-block|exact-text/u.test(tag),
    mutation: /atomic|idempotent|promote|rollback|quarantine|success|retry|recovery/u.test(tag),
    retryJourney: /retry|重试/iu.test(scenario.when ?? ""),
    serverDenied: tag === "deny" || /server-denied|服务端拒绝/iu.test(text),
  };
}

function isOutcomeApiUrl(url, outcome) {
  const pathname = new URL(url).pathname;
  return Object.values(apiRouteByOutcome[outcome]).includes(pathname);
}

async function responseSnapshot(response) {
  const body = await response.json().catch(() => null);
  return {
    body,
    headers: response.headers(),
    ok: response.ok(),
    proof: responseProof(response.headers(), body),
    status: response.status(),
  };
}

function nestedContainsExactValue(value, expected, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return false;
  if (String(value) === expected) return true;
  if (Array.isArray(value)) return value.some((item) => nestedContainsExactValue(item, expected, depth + 1));
  if (typeof value === "object") {
    return Object.values(value).some((item) => nestedContainsExactValue(item, expected, depth + 1));
  }
  return false;
}

function snapshotHasScenario(snapshot, scenarioId) {
  return snapshot.headers["x-starward-acceptance-scenario"] === scenarioId
    || nestedContainsExactValue(snapshot.body, scenarioId);
}

function requireProof(proofs, field, controlId) {
  if (!proofs.some((proof) => {
    const value = proof[field];
    return value !== undefined && value !== null && value !== "" && value !== false;
  })) {
    throw new Error(`ops_backend_${field}_proof_missing:${controlId}`);
  }
}

async function verifyIdempotentReplay(requestContext, request, firstSnapshot, controlId) {
  const headers = request.headers();
  const idempotencyKey = headers["idempotency-key"];
  if (!idempotencyKey) throw new Error(`ops_backend_idempotency_key_missing:${controlId}`);
  const duplicate = await requestContext.fetch(request.url(), {
    data: request.postDataBuffer() ?? undefined,
    failOnStatusCode: false,
    headers,
    method: request.method(),
  });
  const duplicateBody = await duplicate.json().catch(() => null);
  const duplicateProof = responseProof(duplicate.headers(), duplicateBody);
  if (!duplicate.ok()) throw new Error(`ops_backend_idempotent_replay_failed:${controlId}:${duplicate.status()}`);
  if (!firstSnapshot.proof.operation || firstSnapshot.proof.operation !== duplicateProof.operation) {
    throw new Error(`ops_backend_idempotent_operation_changed:${controlId}`);
  }
  if (!firstSnapshot.proof.audit || firstSnapshot.proof.audit !== duplicateProof.audit) {
    throw new Error(`ops_backend_idempotent_audit_changed:${controlId}`);
  }
  return duplicateProof;
}

function stateSemanticDigest(description) {
  return sha256(JSON.stringify({
    semantic: description.semantic,
    text: description.text,
  }));
}

async function readOpsStateTrace(root, stateKey) {
  const traceNode = root.locator(
    `script[type="application/json"][data-starward-design-state-trace=${JSON.stringify(stateKey)}]`,
  ).first();
  await traceNode.waitFor({ state: "attached", timeout: 5_000 }).catch(() => {
    throw new Error(`ops_design_state_trace_missing:${stateKey}`);
  });
  return parseStructuredEvidenceValue(
    await traceNode.textContent(),
    "starward-design-state-trace-v1",
  );
}

async function exerciseProductionStates(browser, baseURL, outcome, controls, controlContracts, artifact) {
  const conditionByKey = new Map(artifact.samples.map((sample) => [sample.condition.key, sample.condition]));
  for (const condition of conditionByKey.values()) {
    const context = await browser.newContext({
      viewport: {
        width: Number(condition.viewport?.width ?? 1440),
        height: Number(condition.viewport?.height ?? 900),
      },
      locale: "zh-CN",
      reducedMotion: condition.motion === "reduced" ? "reduce" : "no-preference",
      extraHTTPHeaders: opsAcceptanceHeaders(condition, outcome),
    });
    try {
      const page = await context.newPage();
      for (const controlId of controls) {
        const contract = controlContracts.get(controlId);
        if (!contract) throw new Error(`ops_control_contract_missing:${controlId}`);
        await productionRoot(page, baseURL, outcome, controlAssembly(outcome, controlId).id);
        const root = await visibleControl(page, controlId);
        const states = applicableControlStates("ops", contract).sort(([left], [right]) => {
          if (left === "default") return -1;
          if (right === "default") return 1;
          return left.localeCompare(right);
        });
        let defaultDescription = null;
        let defaultPng = null;
        for (const [stateKey] of states) {
          await root.dispatchEvent("starward:design-state", {
            conditionKey: condition.key,
            controlId,
            sessionId: opsDesignSessionId,
            state: stateKey,
          });
          await expect.poll(async () =>
            (await root.getAttribute("data-contract-state")) ?? (await root.getAttribute("data-state")),
          { timeout: 5_000 }).toBe(stateKey);
          const currentPng = await root.screenshot({ animations: "disabled" });
          const currentDescription = await describeLocator(root);
          const trace = await readOpsStateTrace(root, stateKey);
          const visualDifference = defaultPng
            ? pixelDifferenceMetrics(defaultPng, currentPng).normalized_difference
            : 0;
          const semanticChanged = defaultDescription
            ? stateSemanticDigest(defaultDescription) !== stateSemanticDigest(currentDescription)
            : false;
          const directObservation = {
            production_root: true,
            semantic_changed: semanticChanged,
            semantic_present: Boolean(currentDescription.semantic.ariaLabel || currentDescription.text),
            semantic_stable: !semanticChanged,
            visual_changed: visualDifference >= visibleChangeThreshold,
            visual_present: currentDescription.box.width >= 44 && currentDescription.box.height >= 44,
            visual_stable: visualDifference < visibleChangeThreshold,
          };
          if (stateKey === "default") {
            defaultDescription = currentDescription;
            defaultPng = currentPng;
          } else {
            await root.dispatchEvent("starward:design-state", {
              conditionKey: condition.key,
              controlId,
              sessionId: opsDesignSessionId,
              state: "default",
            });
            await expect.poll(async () =>
              (await root.getAttribute("data-contract-state")) ?? (await root.getAttribute("data-state")),
            { timeout: 5_000 }).toBe("default");
            const recoveredPng = await root.screenshot({ animations: "disabled" });
            const recoveredDescription = await describeLocator(root);
            if (!defaultPng || !defaultDescription
              || pixelDifferenceMetrics(defaultPng, recoveredPng).normalized_difference > visibleChangeThreshold
              || stateSemanticDigest(defaultDescription) !== stateSemanticDigest(recoveredDescription)) {
              throw new Error(`ops_design_state_exit_recovery_mismatch:${controlId}:${stateKey}:${condition.key}`);
            }
          }
          assertStateTrace({
            control: contract,
            controlId,
            observed: directObservation,
            profile: "ops",
            stateKey,
            trace,
          });
        }
        if (states.length !== applicableControlStates("ops", contract).length) {
          throw new Error(`ops_design_state_population_mismatch:${controlId}:${condition.key}`);
        }
      }
    } finally {
      await context.close();
    }
  }
}

async function exerciseProductionScenarios(
  browser,
  baseURL,
  outcome,
  controls,
  controlContracts,
  { backendProof, conditions },
) {
  const token = process.env.STARWARD_OPS_ACCEPTANCE_ACCESS_TOKEN;
  if (!token) throw new Error("ops_acceptance_access_token_missing");
  if (backendProof) await assertAnonymousDenied(baseURL, outcome);
  if (!Array.isArray(conditions) || !conditions.length) {
    throw new Error(`ops_scenario_conditions_missing:${outcome}`);
  }
  for (const condition of conditions) {
    const context = await browser.newContext({
      viewport: {
        width: Number(condition.viewport?.width ?? 1440),
        height: Number(condition.viewport?.height ?? 900),
      },
      locale: "zh-CN",
      reducedMotion: condition.motion === "reduced" ? "reduce" : "no-preference",
      extraHTTPHeaders: opsAcceptanceHeaders(condition, outcome),
    });
    try {
      const page = await context.newPage();
      for (const controlId of controls) {
      const contract = controlContracts.get(controlId);
      if (!contract) throw new Error(`ops_control_contract_missing:${controlId}`);
      const scenarios = contract.acceptanceScenarios ?? [];
      if (scenarios.length < 2) throw new Error(`ops_acceptance_scenarios_incomplete:${controlId}`);
      const controlProofs = [];
      const controlWrites = [];
      for (const scenario of scenarios) {
        const scenarioId = scenario.id;
        const policy = scenarioPolicy(contract, scenario);
        const requests = [];
        const responses = [];
        const onRequest = (request) => {
          if (isOutcomeApiUrl(request.url(), outcome)) requests.push(request);
        };
        const onResponse = (response) => {
          if (isOutcomeApiUrl(response.url(), outcome)) responses.push(response);
        };
        page.on("request", onRequest);
        page.on("response", onResponse);
        await productionRoot(page, baseURL, outcome, controlAssembly(outcome, controlId).id);
        const root = await visibleControl(page, controlId);
        const action = page.locator(
          `[data-control=${JSON.stringify(controlId)}][data-acceptance-scenario=${JSON.stringify(scenarioId)}], `
          + `[data-control=${JSON.stringify(controlId)}] [data-acceptance-scenario=${JSON.stringify(scenarioId)}]`,
        ).first();
        await action.waitFor({ state: "visible", timeout: 1_000 }).catch(() => {
          throw new Error(`ops_production_scenario_action_missing:${controlId}:${scenarioId}`);
        });
        const beforeDescription = await describeLocator(root);
        const before = await root.screenshot({ animations: "allow" });
        const disabled = await action.isDisabled().catch(() => false);
        if (disabled && !policy.blockedWithoutWrite) {
          throw new Error(`ops_scenario_action_unexpected_disabled:${controlId}:${scenarioId}`);
        }
        if (!disabled) await action.click();
        await page.waitForTimeout(350);
        page.off("request", onRequest);
        page.off("response", onResponse);
        const after = await root.screenshot({ animations: "allow" });
        const changed = pixelDifferenceMetrics(before, after).normalized_difference;
        const state = await root.getAttribute("data-contract-state") ?? await root.getAttribute("data-state");
        const scenarioResult = root.locator(`[data-acceptance-result=${JSON.stringify(scenarioId)}]`).first();
        const stateText = `${state ?? ""} ${await scenarioResult.isVisible().catch(() => false)
          ? await scenarioResult.innerText().catch(() => "")
          : ""}`.trim();
        if (changed < visibleChangeThreshold && !stateText) throw new Error(`ops_scenario_state_unobserved:${controlId}:${scenarioId}`);
        const afterDescription = await describeLocator(root);
        const traceValue = await scenarioResult.getAttribute("data-starward-design-scenario-trace")
          ?? await scenarioResult.locator(
            'script[type="application/json"][data-starward-design-scenario-trace]',
          ).first().textContent().catch(() => null);
        const trace = parseStructuredEvidenceValue(
          traceValue,
          "starward-design-scenario-trace-v1",
        );
        assertScenarioTrace({
          control: contract,
          controlId,
          observed: {
            production_root: true,
            semantic_observed: stateSemanticDigest(beforeDescription) !== stateSemanticDigest(afterDescription)
              || Boolean(stateText),
            visual_observed: changed >= visibleChangeThreshold || Boolean(stateText),
          },
          profile: "ops",
          scenario,
          trace,
        });
        if (backendProof) {
          if (!requests.length || !responses.length) throw new Error(`ops_backend_scenario_request_missing:${controlId}:${scenarioId}`);
          for (const request of requests) {
            if (request.headers().authorization !== `Bearer ${token}`) {
              throw new Error(`ops_backend_authorization_missing:${controlId}:${scenarioId}`);
            }
          }
          const snapshots = await Promise.all(responses.map(responseSnapshot));
          const scenarioProofs = snapshots.map((snapshot) => snapshot.proof);
          if (!snapshots.some((snapshot) => snapshotHasScenario(snapshot, scenarioId))) {
            throw new Error(`ops_backend_scenario_attribution_missing:${controlId}:${scenarioId}`);
          }
          controlProofs.push(...scenarioProofs);
          const writes = requests.filter((request) => request.method() !== "GET" && request.method() !== "HEAD");
          controlWrites.push(...writes);
          if (policy.blockedWithoutWrite && writes.length) {
            throw new Error(`ops_backend_blocked_scenario_wrote:${controlId}:${scenarioId}`);
          }
          if (policy.serverDenied && !snapshots.some((snapshot) => [401, 403].includes(snapshot.status))) {
            throw new Error(`ops_backend_field_denial_missing:${controlId}:${scenarioId}`);
          }
          if (policy.mutation) {
            const write = writes[0];
            if (!write) throw new Error(`ops_backend_write_request_missing:${controlId}:${scenarioId}`);
            const response = await write.response();
            if (!response) throw new Error(`ops_backend_write_response_missing:${controlId}:${scenarioId}`);
            const snapshot = snapshots.find((candidate) => candidate.status === response.status()
              && snapshotHasScenario(candidate, scenarioId));
            if (!snapshot?.ok) throw new Error(`ops_backend_effect_failed:${controlId}:${response.status()}`);
            if (contract.interactionStateMachine?.idempotency?.required === true) {
              controlProofs.push(await verifyIdempotentReplay(context.request, write, snapshot, controlId));
            }
          }
          if (policy.retryJourney) {
            const statuses = snapshots.map((snapshot) => snapshot.status);
            if (!statuses.some((status) => status >= 400) || !statuses.some((status) => status >= 200 && status < 300)) {
              throw new Error(`ops_backend_failure_retry_sequence_missing:${controlId}:${scenarioId}`);
            }
          }
        }
      }
      if (backendProof) {
        for (const field of [
          "actor", "audit", "failure", "permission", "readback", "recovery", "redaction",
          "retry", "session", "source", "telemetry", "timeout",
        ]) requireProof(controlProofs, field, controlId);
        if (contract.interactionStateMachine?.idempotency?.required === true) {
          if (!controlWrites.length) throw new Error(`ops_backend_control_write_population_missing:${controlId}`);
          for (const field of ["idempotency", "operation"]) requireProof(controlProofs, field, controlId);
        }
        const dangerous = contract.interactionStateMachine?.dangerousOperation;
        if (dangerous?.status === "applicable") {
          for (const field of ["confirmation", "impact"]) requireProof(controlProofs, field, controlId);
          if (/mfa|reauth/iu.test(JSON.stringify(dangerous))) requireProof(controlProofs, "reauth", controlId);
        }
      }
      }
    } finally {
      await context.close();
    }
  }
}

async function validateMotion(browser, baseURL, outcome, controls, controlContracts, artifact, variant = null) {
  const conditionByKey = new Map(artifact.samples.map((sample) => [sample.condition.key, sample.condition]));
  const conditions = [...conditionByKey.values()].filter((condition) =>
    variant === "full" ? condition.motion !== "reduced"
      : variant === "reduced" ? condition.motion === "reduced"
        : true);
  if (!conditions.length) throw new Error(`ops_motion_conditions_missing:${outcome}:${variant ?? "all"}`);
  for (const condition of conditions) {
    const reduced = condition.motion === "reduced";
    const context = await browser.newContext({
      viewport: {
        width: Number(condition.viewport?.width ?? 1440),
        height: Number(condition.viewport?.height ?? 900),
      },
      locale: "zh-CN",
      reducedMotion: reduced ? "reduce" : "no-preference",
      extraHTTPHeaders: opsAcceptanceHeaders(condition, outcome),
    });
    try {
      const page = await context.newPage();
      for (const controlId of controls) {
        await productionRoot(page, baseURL, outcome, controlAssembly(outcome, controlId).id);
        const root = await visibleControl(page, controlId);
        const action = root.locator("button,[role=button],[role=tab],a[href],input,select").first();
        const interactive = await action.count() ? action : root;
        const style = await computedStyleSnapshot(interactive);
        const duration = style.transitionDuration;
        const declared = Number(controlContracts.get(controlId)?.motion?.durationMs);
        const durationMs = duration.split(",").map((value) => value.trim()).map((value) =>
          value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1_000);
        if (!reduced && declared > 0
          && !durationMs.some((value) => Number.isFinite(value) && Math.abs(value - declared) <= 20)) {
          throw new Error(`ops_full_motion_duration_mismatch:${controlId}:${condition.key}`);
        }
        if (reduced && durationMs.some((value) => Number.isFinite(value) && value > 0)) {
          throw new Error(`ops_reduced_motion_not_replaced:${controlId}:${condition.key}`);
        }
        const before = await root.screenshot({ animations: "allow" });
        await interactive.hover();
        await page.mouse.down();
        await page.waitForTimeout(80);
        const pressed = await root.screenshot({ animations: "allow" });
        await page.mouse.up();
        if (!reduced && pixelDifferenceMetrics(before, pressed).normalized_difference < visibleChangeThreshold) {
          throw new Error(`ops_pressed_motion_unobserved:${controlId}:${condition.key}`);
        }
        if (!reduced && declared > 0) {
          await page.waitForTimeout(Math.max(16, Math.min(60, declared / 2)));
          const reversing = await root.screenshot({ animations: "allow" });
          await page.mouse.down();
          await page.waitForTimeout(16);
          const interrupted = await root.screenshot({ animations: "allow" });
          await page.mouse.up();
          if (pixelDifferenceMetrics(reversing, interrupted).normalized_difference < visibleChangeThreshold) {
            throw new Error(`ops_motion_interruption_unobserved:${controlId}:${condition.key}`);
          }
        }
      }
    } finally {
      await context.close();
    }
  }
}

function validateOpsExactFieldWitnesses(artifact, method) {
  if (artifact.target.interpretation !== "exact_target") return;
  if (opsDesignSessionId === "missing-design-session") {
    throw new Error("ops_design_runtime_witness_session_missing");
  }
  const samples = artifact.samples.filter((sample) => sample.kind === "control");
  if (!samples.length) throw new Error(`ops_exact_target_samples_missing:${artifact.target.key}`);
  for (const sample of samples) {
    assertExactRuntimeFieldWitnesses({
      condition_key: sample.condition.key,
      control: sample.contract,
      control_id: sample.controlId,
      corroboration: designWitnessCorroboration(method),
      method,
      mode: sample.mode,
      outcome: artifact.outcome,
      profile: "ops",
      records: sample.actual.runtimeWitnesses,
      sample_id: sample.sampleId,
      session_id: sample.sessionId,
    });
    assertExactRuntimeProfileWitnesses({
      condition_key: sample.condition.key,
      contract: opsControlContract,
      corroboration: designWitnessCorroboration(method),
      method,
      mode: sample.mode,
      outcome: artifact.outcome,
      profile: "ops",
      records: sample.profileWitnesses,
      sample_id: sample.profileSampleId,
      session_id: sample.sessionId,
    });
  }
}

async function validateMethod({
  artifact,
  baseURL,
  browser,
  controlContracts,
  controls,
  method,
  outcome,
  variant = null,
}) {
  if (method === "visual_pixel") validateVisual(artifact);
  else if (method === "layout_geometry") validateGeometry(artifact, controls);
  else if (method === "accessibility_semantics") validateAccessibility(artifact, controls, controlContracts);
  else if (method === "content") validateContent(artifact, controls, controlContracts);
  else if (method === "design_token") validateDesignTokens(artifact, controls, controlContracts);
  else if (method === "responsive_reflow") validateResponsive(artifact, controls);
  else if (method === "asset_integrity") validateAssets(artifact, controls, controlContracts);
  else if (method === "input_method") {
    await validateInputAndFocus(browser, baseURL, outcome, controls, controlContracts, artifact);
  }
  else if (method === "component_state") {
    await exerciseProductionStates(browser, baseURL, outcome, controls, controlContracts, artifact);
    await exerciseProductionScenarios(
      browser,
      baseURL,
      outcome,
      controls,
      controlContracts,
      {
        backendProof: false,
        conditions: [...new Map(artifact.samples.map((sample) => [sample.condition.key, sample.condition])).values()],
      },
    );
  }
  else if (method === "interaction_trace") await exerciseProductionScenarios(
    browser,
    baseURL,
    outcome,
    controls,
    controlContracts,
    {
      backendProof: variant !== "state",
      conditions: [...new Map(artifact.samples.map((sample) => [sample.condition.key, sample.condition])).values()],
    },
  );
  else if (method === "motion_timeline") {
    await validateMotion(browser, baseURL, outcome, controls, controlContracts, artifact, variant);
  }
  else throw new Error(`ops_design_method_unsupported:${method}`);
  validateOpsExactFieldWitnesses(artifact, method);
}

function validateMethodOnce(input) {
  const key = [
    process.env.STARWARD_DESIGN_ACCEPTANCE_RUN_ID ?? "local",
    input.baseURL,
    input.outcome,
    input.artifact.target.key,
    input.method,
    input.variant ?? "all",
  ].join("|");
  if (!methodValidationCache.has(key)) methodValidationCache.set(key, validateMethod(input));
  return methodValidationCache.get(key);
}

export async function exerciseOpsDesignAssertion({
  browser,
  baseURL,
  conditions,
  controlContracts,
  controls,
  methods,
  outcome,
  rows,
  target,
  method,
  variant = null,
}) {
  if (!baseURL) throw new Error("acceptance_base_url_missing");
  validateCoverage(target, method, rows, conditions);
  const artifact = await acquisition({ browser, baseURL, conditions, controlContracts, controls, outcome, target });
  const selectedMethods = method === "conformance" ? methods : [method];
  for (const selectedMethod of selectedMethods) {
    await validateMethodOnce({
      artifact,
      baseURL,
      browser,
      controlContracts,
      controls,
      method: selectedMethod,
      outcome,
      variant: method === "conformance" ? null : variant,
    });
  }
  const output = path.join(
    artifact.paths.directory,
    `${target.key}-${method}${variant ? `-${variant}` : ""}-evidence.json`,
  );
  await writeFile(output, `${JSON.stringify({
    schema_version: "starward-ops-design-method-evidence-v2",
    outcome,
    target: target.key,
    method,
    variant,
    condition_keys: target.condition_refs,
    coverage_row_keys: rows.map((row) => row.key),
    controls,
    actual_artifact_path: artifact.paths.actualRelative,
    comparison_artifact_path: artifact.paths.comparisonRelative,
    actual_sha256: sha256(artifact.actual),
    comparison_sha256: sha256(artifact.comparison),
    exact_contract_accounting: artifact.target.interpretation === "exact_target" ? {
      controls: opsContractPopulation.controlCount,
      control_fields: opsContractPopulation.controlFieldCount,
      profile_fields: opsContractPopulation.rootFieldCount,
      runtime_fields: opsContractPopulation.runtimeFieldCount,
      total_fields: opsContractPopulation.fieldCount,
    } : null,
    samples: artifact.samples.map((sample) => ({
      condition_key: sample.condition.key,
      assembly_id: sample.assemblyId ?? null,
      control_id: sample.controlId ?? null,
      pixel: sample.kind === "authority-reference" ? null : pixelDifferenceMetrics(sample.actualPng, sample.comparisonPng),
      profile_witness_count: sample.profileWitnesses?.length ?? 0,
      runtime_witness_count: sample.actual?.runtimeWitnesses?.length
        ?? Object.values(sample.actualControls ?? {}).reduce(
          (count, control) => count + (control.runtimeWitnesses?.length ?? 0),
          0,
        ),
    })),
  }, null, 2)}\n`, "utf8");
}

async function verifyFrozenResources(handoff) {
  for (const resource of handoff.resources) {
    const absolute = path.join(repositoryRoot, ...resource.path.split("/"));
    const bytes = await readFile(absolute);
    if (sha256(bytes) !== resource.sha256) throw new Error(`design_resource_digest_mismatch:${resource.key}`);
    if (resource.media_type === "application/json") JSON.parse(bytes.toString("utf8"));
    if (resource.media_type === "text/html" && !/<html\b/iu.test(bytes.toString("utf8"))) {
      throw new Error(`design_resource_html_invalid:${resource.key}`);
    }
  }
}

export async function exerciseDesignResourceAcceptance({ handoff, handoffContent, key }) {
  if (key === "dr-provider-provenance") {
    if (handoff.provenance?.provider !== "Open Design local daemon"
      || handoff.provenance?.provider_version !== "0.15.1"
      || handoff.provenance?.design_system_id !== "user:design-md") {
      throw new Error("design_provider_provenance_incomplete");
    }
    if (handoff.resources.some((resource) => !resource.editable_upstream?.locator || !resource.editable_upstream?.owner)) {
      throw new Error("design_resource_upstream_provenance_incomplete");
    }
  } else if (key === "dr-condition-matrix") {
    const expected = [
      "mobile-android-360-full", "mobile-android-390-full", "mobile-android-430-full",
      "mobile-android-tablet-full", "mobile-android-landscape-full", "mobile-android-390-reduced",
      "mobile-ios-semantic-390-full", "mobile-ios-semantic-390-reduced",
      "ops-web-1440-full", "ops-web-1180-full", "ops-web-1024-full", "ops-web-820-full",
      "ops-web-1440-reduced",
    ].sort();
    const actual = handoff.conditions
      .filter((condition) => condition.key !== "reference-authority")
      .map((condition) => condition.key)
      .sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("design_condition_matrix_incomplete");
  } else if (key === "dr-upstream-update-route") {
    const design = await readFile(path.join(repositoryRoot, "DESIGN.md"), "utf8");
    const adopted = [
      "target.mobile-product-pages-v2", "target.mobile-controls-v3",
      "target.ops-product-pages-v1", "target.ops-controls-v2",
    ];
    const selectedResourceRefs = new Set(handoff.targets
      .filter((target) => target.source_profile)
      .flatMap((target) => [
        target.source_profile.entry_resource_ref,
        ...target.source_profile.dependency_resource_refs,
      ]));
    const selectedResources = handoff.resources
      .filter((resource) => selectedResourceRefs.has(resource.key)
        && resource.path.startsWith("docs/design-targets/"));
    if (adopted.some((target) => !design.includes(target))
      || selectedResources.length !== 14
      || selectedResources.some((resource) => !/new immutable version/iu.test(resource.editable_upstream?.update_route ?? ""))) {
      throw new Error("design_upstream_update_route_incomplete");
    }
  } else if (key === "dr-proposal-reconciliation") {
    const proposal = await readFile(
      path.join(repositoryRoot, "docs/design-resources/initial-product-design-resource-gap-and-authoring-brief.md"),
      "utf8",
    );
    if (!proposal.includes("docs/design-resources/starward-residual-implementation-handoff.md")
      || !proposal.includes(sha256(Buffer.from(handoffContent, "utf8")))
      || !/Final reconciliation/iu.test(proposal)) {
      throw new Error("design_proposal_reconciliation_incomplete");
    }
  } else if (key === "dr-resource-integrity") {
    await verifyFrozenResources(handoff);
  } else if (key === "dr-source-profile-closure") {
    const resources = new Set(handoff.resources.map((resource) => resource.key));
    for (const target of handoff.targets) {
      const profile = target.source_profile;
      if (profile?.acquisition !== "complete" || !resources.has(profile.entry_resource_ref)
        || profile.dependency_resource_refs.some((resource) => !resources.has(resource))
        || JSON.stringify([...target.resource_refs].sort())
          !== JSON.stringify([profile.entry_resource_ref, ...profile.dependency_resource_refs].sort())) {
        throw new Error(`design_source_profile_incomplete:${target.key}`);
      }
    }
    await verifyFrozenResources(handoff);
  } else if (key === "dr-stable-key-bijection") {
    const surfaces = handoff.subjects.filter((subject) => subject.kind === "surface").flatMap((subject) => subject.stable_keys);
    const controls = handoff.subjects.filter((subject) => subject.kind === "control").flatMap((subject) => subject.stable_keys);
    if (surfaces.length !== 14 || new Set(surfaces).size !== 14 || controls.length !== 95 || new Set(controls).size !== 95) {
      throw new Error("design_stable_key_bijection_mismatch");
    }
    if (handoff.coverage.length !== 888 || handoff.acceptance_blockers.length !== 22) {
      throw new Error("design_handoff_accounting_population_mismatch");
    }
    if (handoff.subjects.some((subject) => subject.target_refs.length === 0)) throw new Error("design_subject_target_unbound");
    const mobilePages = JSON.parse(await readFile(
      path.join(repositoryRoot, "docs/design-targets/mobile-product-pages-v2/coverage-manifest.json"),
      "utf8",
    ));
    if (mobilePages.outcomes?.length !== 12 || opsPageCoverage.routes?.length !== 7
      || mobilePages.outcomes.length + opsPageCoverage.routes.length !== 19) {
      throw new Error("design_page_assembly_population_mismatch");
    }
    const mobileControls = JSON.parse(await readFile(
      path.join(repositoryRoot, "docs/design-targets/mobile-controls-v3/implementation-contract.json"),
      "utf8",
    ));
    const opsControls = JSON.parse(await readFile(
      path.join(repositoryRoot, "docs/design-targets/ops-controls-v2/implementation-contract.json"),
      "utf8",
    ));
    const mobileAccounting = assertExactContractPopulation("mobile", mobileControls);
    const opsAccounting = assertExactContractPopulation("ops", opsControls);
    if (mobileAccounting.fieldCount + opsAccounting.fieldCount !== 74_580
      || mobileAccounting.runtimeFieldCount + opsAccounting.runtimeFieldCount !== 65_455) {
      throw new Error("design_exact_field_accounting_population_mismatch");
    }
    const mobileScenarios = Object.values(mobileControls.controls)
      .reduce((count, control) => count + (control.acceptanceScenarios?.length ?? 0), 0);
    const opsScenarios = opsControls.controls
      .reduce((count, control) => count + (control.acceptanceScenarios?.length ?? 0), 0);
    if (mobileScenarios !== 208 || opsScenarios !== 32 || mobileScenarios + opsScenarios !== 240) {
      throw new Error("design_acceptance_scenario_population_mismatch");
    }
  } else {
    throw new Error(`design_resource_acceptance_unsupported:${key}`);
  }
}

const globalMethodPlans = Object.freeze({
  "dr-surface-flow": [{ kind: "page", method: "interaction_trace", variant: "state" }],
  "dr-visual-content": [
    { kind: "page", method: "visual_pixel" },
    { kind: "control", method: "visual_pixel" },
  ],
  "dr-component-control": [{ kind: "control", method: "component_state" }],
  "dr-state-interaction": [{ kind: "control", method: "interaction_trace", variant: "state" }],
  "dr-motion-full": [{ kind: "control", method: "motion_timeline", variant: "full" }],
  "dr-motion-reduced": [{ kind: "control", method: "motion_timeline", variant: "reduced" }],
  "dr-adaptation-input": [
    { kind: "page", method: "responsive_reflow" },
    { kind: "page", method: "input_method" },
    { kind: "control", method: "responsive_reflow" },
    { kind: "control", method: "input_method" },
  ],
  "dr-accessibility": [
    { kind: "page", method: "accessibility_semantics" },
    { kind: "control", method: "accessibility_semantics" },
  ],
  "dr-assets-license": [{ kind: "control", method: "asset_integrity" }],
  "dr-design-conformance": [
    { kind: "page", method: "conformance" },
    { kind: "control", method: "conformance" },
  ],
  "dr-ops-backend-effect": [{ kind: "control", method: "interaction_trace", variant: "backend" }],
});

export async function exerciseGlobalDesignMethodAcceptance({
  baseURL,
  browser,
  contractByControl,
  handoff,
  key,
}) {
  const plans = globalMethodPlans[key];
  if (!plans) throw new Error(`global_design_method_unsupported:${key}`);
  const outcomes = ["admin-data-operations", "quality-release-observability"];
  for (const outcome of outcomes) {
    const controls = handoff.subjects
      .filter((subject) => subject.kind === "control" && subject.target_refs.some((ref) => ref.endsWith(`-${outcome}`)))
      .flatMap((subject) => subject.stable_keys)
      .sort();
    const controlContracts = new Map(controls.map((control) => [control, contractByControl.get(control)]));
    for (const plan of plans) {
      const prefix = plan.kind === "page" ? "ops-page-constraint-" : "ops-control-exact-";
      const target = handoff.targets.find((candidate) => candidate.key === `${prefix}${outcome}`);
      if (!target) throw new Error(`global_design_target_missing:${outcome}:${plan.kind}`);
      const allRows = handoff.coverage.filter((row) => row.disposition === "covered" && row.target_refs.includes(target.key));
      const methods = [...new Set(allRows.flatMap((row) => row.verification_methods))].sort();
      const rows = plan.method === "conformance"
        ? allRows
        : allRows.filter((row) => row.verification_methods.includes(plan.method));
      await exerciseOpsDesignAssertion({
        browser,
        baseURL,
        conditions: handoff.conditions.filter((condition) => target.condition_refs.includes(condition.key)),
        controlContracts,
        controls,
        methods,
        outcome,
        rows,
        target,
        method: plan.method,
        variant: plan.variant ?? null,
      });
    }
  }
}
