import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../../../", import.meta.url);
const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");

const projectId = "starward-miniapp-field-signal-all-resources";
const designSystemId = "user:starward-mini-program-sky-canvas-field-signal-revision";
const stableTarget = "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02";
const expectedFileHashes = {
  "index.html": "b30d751f852b5b978c84759a99762cd61201d25faf3e0bda77c5097690a88c60",
  "assets/styles.css": "5284cc77d46dc6f61ab5ef6b2912d14949b9f59f385855cc890080084407f51f",
  "assets/app.js": "3cbc5f8e55ceaf6917b864150905f30ad539474c4c92f27a156e30079d9c99a1",
  "coverage.json": "0dcbeef98e091b2be2bfaef5a6c270a355fba121220fea5c9ec0ba3a51e7f886",
  "README.md": "8e7d6d15aa45244f03e211ebd1c4231958b5823921739f0596cb575c1576d5b1",
};
const expectedSurfaces = [
  "miniapp-map-discovery",
  "miniapp-sky-orientation",
  "miniapp-my-library",
  "miniapp-profile-content",
  "miniapp-contribution-intake",
];
const expectedCurrentRoutes = [
  "pages/map/index",
  "spot/search",
  "sky/detail",
  "pages/my/index",
  "plan/detail",
  "settings",
  "profile/links",
  "content/import",
  "content/contribution/index",
];
const retiredControls = [
  "map-finder-advanced-filters",
  "map-finder-query-overlay",
  "map-finder-quick-filters",
  "map-finder-result-list",
  "map-finder-search-field",
  "map-finder-sheet-handle",
  "map-marker-card-coordinator",
  "map-selected-spot-callout",
  "map-spot-finder-sheet",
  "map-spot-finder-trigger",
  "sky-orientation-entry",
  "spot-header-actions",
  "spot-night-entry",
  "spot-segment-tabs",
  "source-lift-focus-layer",
  "map-analysis-time-bar",
  "spot-tonight-decision",
  "observation-mode-control",
];
const retiredRoutes = ["spot/detail", "spot/sky", "sky/professional", "sky/targets"];
const prohibitedNoise = [
  "操作说明",
  "方向跟随中",
  "部分数据",
  "同一地图",
  "一个分析图层",
  "本地时间",
  "谨慎出发",
  "推荐窗口",
  "关闭图层",
  "筛选条件",
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");

async function checked(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) throw new Error(`${path} -> ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response;
}

const health = await checked("/api/health").then((item) => item.json());
assert.equal(health.ok, true);
const directory = await checked("/api/workspace/directory").then((item) => item.json());
const workspace = directory.items.find(
  (item) => item.workspaceId === directory.activeWorkspaceId
) || directory.items.find(
  (item) => item.memberStatus === "active" && item.lifecycleState !== "deleted"
);
assert(workspace);
const headers = {
  "x-od-workspace-id": workspace.workspaceId,
  "x-od-workspace-member-id": workspace.workspaceMemberId,
};

async function projectFile(name) {
  const response = await checked(
    `/api/projects/${encodeURIComponent(projectId)}/files/${encodePath(name)}`,
    { headers },
  );
  return Buffer.from(await response.arrayBuffer());
}

const names = ["index.html", "assets/styles.css", "assets/app.js", "coverage.json", "README.md"];
const files = {};
const localFiles = {};
for (const name of names) {
  files[name] = await projectFile(name);
  localFiles[name] = await readFile(new URL(
    `artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/candidate/${name}`,
    root,
  ));
  assert.equal(
    sha256(files[name]),
    sha256(localFiles[name]),
    `${name} differs between Open Design and the repository candidate`,
  );
  assert.equal(
    sha256(files[name]),
    expectedFileHashes[name],
    `${name} differs from the audited I21 current-candidate digest`,
  );
}

const workingIndex = await readFile(
  new URL(
    "artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/working-index.md",
    root,
  ),
  "utf8",
);
const inventory = workingIndex.match(
  /- 完整 material Control inventory[\s\S]*?\n- 当前总数为 \*\*62\*\*/,
)?.[0];
assert(inventory, "cannot locate canonical Control inventory");
const expectedControls = [...inventory.matchAll(/`([a-z][a-z0-9-]+)`/g)]
  .map((match) => match[1]);
assert.equal(new Set(expectedControls).size, 62, "canonical inventory must contain 62 unique Controls");

const codeText = `${files["index.html"].toString("utf8")}\n${files["assets/app.js"].toString("utf8")}`;
const observedControls = [...new Set(
  [...codeText.matchAll(/data-control=["']([a-z][a-z0-9 -]+)["']/g)]
    .flatMap((match) => match[1].trim().split(/\s+/)),
)].sort();
const expectedSet = new Set(expectedControls);
const observedSet = new Set(observedControls);
const missingControls = [...expectedSet].filter((key) => !observedSet.has(key)).sort();
const extraControls = [...observedSet].filter((key) => !expectedSet.has(key)).sort();

let coverage;
let coverageError = null;
try {
  coverage = JSON.parse(files["coverage.json"].toString("utf8"));
} catch (error) {
  coverageError = String(error);
}

const coverageControlKeys = Array.isArray(coverage?.controlDispositions)
  ? coverage.controlDispositions.flatMap((entry) =>
      typeof entry.key === "string" ? [entry.key] : Array.isArray(entry.keys) ? entry.keys : [])
  : [];
const coverageControlSet = new Set(coverageControlKeys);
const coverageMissingControls = [...expectedSet].filter((key) => !coverageControlSet.has(key)).sort();
const coverageExtraControls = [...coverageControlSet].filter((key) => !expectedSet.has(key)).sort();

const occurrenceCount = (text, needle) => text.split(needle).length - 1;
const appText = files["assets/app.js"].toString("utf8");
const stylesText = files["assets/styles.css"].toString("utf8");
const visibleCodeText = `${files["index.html"].toString("utf8")}\n${appText}`;

assert.equal(coverageError, null, "coverage.json must parse");
assert.equal(coverage?.schema, "starward-field-signal-i21-current-candidate-coverage");
assert.equal(coverage?.canonicalEntry, "index.html");
assert.equal(coverage?.designSystemId, designSystemId);
assert.equal(coverage?.stableTarget, stableTarget);
assert.deepEqual(coverage?.candidateBoundary, {
  status: "current-unselected-candidate",
  selectionClaimed: false,
  freezeClaimed: false,
  handoffClaimed: false,
  productionAcceptanceClaimed: false,
  productionCodeEdited: false,
  productSurfaceCount: 5,
  materialControlCount: 62,
  unresolvedItems: 0,
});
assert.equal(expectedSet.size, 62);
assert.equal(observedSet.size, 62);
assert.deepEqual(missingControls, []);
assert.deepEqual(extraControls, []);
assert.equal(coverageControlSet.size, 62);
assert.deepEqual(coverageMissingControls, []);
assert.deepEqual(coverageExtraControls, []);
assert.deepEqual(
  [...(coverage?.surfaces || coverage?.surfaceDispositions || []).map((item) => item.key)].sort(),
  [...expectedSurfaces].sort(),
);
assert.deepEqual(
  [...(coverage?.routeTopology?.current || []).map((item) => item.route)].sort(),
  [...expectedCurrentRoutes].sort(),
);
assert.deepEqual(
  [...(coverage?.routeTopology?.retired || []).map((item) => item.route)].sort(),
  [...retiredRoutes].sort(),
);
assert.equal(coverage?.inventorySummary?.expectedControls, 62);
assert.equal(coverage?.inventorySummary?.coveredControls, 62);
assert.equal(coverage?.inventorySummary?.expectedSurfaces, 5);
assert.equal(coverage?.inventorySummary?.coveredSurfaces, 5);
assert.equal(coverage?.candidateBoundary?.unresolvedItems, 0);
assert.deepEqual(coverage?.unresolvedItems, []);
for (const key of retiredControls) assert.equal(occurrenceCount(codeText, key), 0, `${key} returned`);
for (const route of retiredRoutes) assert.equal(occurrenceCount(appText, route), 0, `${route} returned`);
assert.equal(occurrenceCount(visibleCodeText, "演示数据"), 0);
assert.equal(occurrenceCount(visibleCodeText, "版本"), 0);
assert.equal(occurrenceCount(visibleCodeText.toLowerCase(), "version"), 0);
for (const copy of prohibitedNoise) assert.equal(occurrenceCount(visibleCodeText, copy), 0, `noise copy returned: ${copy}`);

const markers = {
  dedicatedSearch: /spot\/search|spot-search-shell/i.test(codeText),
  stationarySearchFrame: /search-anchor/.test(stylesText) && /focusWithoutScroll\(root\.querySelector\("#spot-search-input"\)\)/.test(appText),
  outsideSearchBlur: /state\.route === "spot\/search"[\s\S]*?input\?\.blur\(\)/.test(appText),
  searchBackWithoutClear: /data-action="search-back"/.test(appText) && !/data-action="search-clear"/.test(appText),
  searchBackHitTarget: /\.search-page \.search-leading-search\s*\{[^}]*pointer-events:\s*none/.test(stylesText),
  titlelessFilters: /<legend class="sr-only">观星点筛选<\/legend>/.test(appText) && !/>筛选条件</.test(appText),
  retainedDisclosureTree: /data-partition-body/.test(appText)
    && /body\.scrollHeight/.test(appText)
    && /partitionAnimations\.get\(body\)\?\.cancel\(\)/.test(appText),
  resultMedia52PercentField: /width:\s*66%/.test(stylesText) && /78\.79%/.test(stylesText),
  curvedRuler: /ruler-tick/.test(stylesText) && /updateRulerElement/.test(appText) && /translateY\(\$\{offset\}px\) scale\(\$\{scale\}\)/.test(appText),
  hiddenScrollbars: /scrollbar-width:\s*none/.test(stylesText) && /::-webkit-scrollbar\s*\{[^}]*display:\s*none/.test(stylesText),
  pureWhiteDay: /--canvas:\s*#FFFFFF/.test(stylesText) && /--surface:\s*#FFFFFF/.test(stylesText),
  navSafeLargePanel: /--primary-nav-clearance:\s*calc\(62px \+ var\(--safe-bottom\)\)/.test(stylesText)
    && /\.spot-panel\[data-extent="large"\]\s*\{[^}]*top:\s*0[^}]*bottom:\s*var\(--primary-nav-clearance\)/.test(stylesText),
  handleOnlyPanelDrag: /event\.target\.closest\("\[data-handle-drag\]"\)/.test(appText)
    && /Math\.hypot\(totalX, totalY\) < 8/.test(appText)
    && /active:\s*false/.test(appText),
  centeredSectionRail: /\.panel-rail\s*\{[^}]*top:\s*50%[^}]*translateY\(-50%\)/.test(stylesText),
  compactActionRail: /\.panel-actions\s*\{[^}]*height:\s*44px/.test(stylesText),
  uniformActionIcons: /\.panel-actions \.ui-icon\s*\{[^}]*width:\s*11px;[^}]*height:\s*11px/.test(stylesText),
  bottomLayerSheet: /\.layer-sheet\s*\{[^}]*bottom:\s*0[^}]*height:\s*calc\(166px/.test(stylesText),
  imageBackedLayerChoices: /layerArtwork\(value\)/.test(appText) && /\.layer-art\s*\{/.test(stylesText),
  conditionalMedia: /const media = showMedia \?/.test(appText)
    && /data-has-media="\$\{showMedia\}"/.test(appText)
    && /const media = hasMedia \?/.test(appText),
  causalPanelExit: /data-closing/.test(appText) && /220ms/.test(stylesText + appText),
  panelExtents: ["hidden", "small", "medium", "large"].every((value) => codeText.includes(value)),
  cloudToSkyDetail: /sky\/detail/.test(appText),
  headerlessFullSky: /orientation-back/.test(appText) && !/orientation-header/.test(appText),
  oneRetainedPanelDocument: occurrenceCount(appText, 'class="panel-document"') === 1
    && /\.spot-panel\[data-extent="large"\] \.panel-document\s*\{[^}]*overflow-y:\s*auto/.test(stylesText),
  mediaFirstThenChrome: /const chromeOpacity = 1 - Math\.max\(0, Math\.min\(1, \(bounded - \.82\) \/ \.12\)\)/.test(appText)
    && /const phase = Math\.max\(0, Math\.min\(1, \(bounded - \.50\) \/ \.28\)\)/.test(appText),
  compactHandleGeometry: /\.panel-handle-hot\s*\{[^}]*width:\s*52px;[^}]*height:\s*20px/.test(stylesText)
    && /\.panel-handle-hot::before\s*\{[^}]*width:\s*26px;[^}]*height:\s*2\.5px/.test(stylesText),
  paleActiveSurface: /--sky-soft:\s*#F5F6FF/.test(stylesText),
  arrowlessRuler: !/ruler-arrow/.test(codeText) && /\.ruler\s*\{[^}]*translateY\(-8px\)/.test(stylesText),
  threeStateDisplayTrack: /const modes = \[\["day", "日间"\], \["night", "夜间"\], \["observation", "观测"\]\]/.test(appText)
    && /data-mode-track/.test(appText),
  contributionSingleDocument: occurrenceCount(appText, 'class="contribution-form"') === 1
    && occurrenceCount(appText, 'data-action="contribution-submit"') === 1
    && /contributionMedia/.test(appText)
    && /state\.drafts\.evidence/.test(appText),
  reuseFirstMapping: Array.isArray(coverage?.productionReuseMapping)
    && coverage.productionReuseMapping.length === 10
    && coverage?.implementationVerification?.preferredPackage === "@taroify/core@1.0.6"
    && coverage?.implementationVerification?.htmlPrototypeImportsTaroify === false
    && !/taroify/i.test(codeText),
  semanticIconRetained: coverage?.productionReuseMapping?.some((item) => item.component === "SemanticIcon")
    && coverage?.implementationVerification?.secondIconSystemPresent === false,
};
for (const [name, value] of Object.entries(markers)) assert.equal(value, true, `missing current marker: ${name}`);

console.log(JSON.stringify({
  schema: "starward-open-design-candidate-inspection",
  providerVersion: health.version,
  files: Object.fromEntries(names.map((name) => [name, {
    bytes: files[name].length,
    sha256: sha256(files[name]),
    repositoryParity: sha256(files[name]) === sha256(localFiles[name]),
    auditedDigestMatch: sha256(files[name]) === expectedFileHashes[name],
  }])),
  controls: {
    expectedCount: expectedSet.size,
    observedDataControlCount: observedSet.size,
    missing: missingControls,
    extra: extraControls,
  },
  retiredControlOccurrences: Object.fromEntries(
    retiredControls.map((key) => [key, occurrenceCount(codeText, key)]),
  ),
  retiredRouteOccurrences: Object.fromEntries(
    retiredRoutes.map((key) => [key, occurrenceCount(appText, key)]),
  ),
  prohibitedVisibleCopy: {
    demoData: occurrenceCount(visibleCodeText, "演示数据"),
    releaseVersionChinese: occurrenceCount(visibleCodeText, "版本"),
    releaseVersionEnglish: occurrenceCount(visibleCodeText.toLowerCase(), "version"),
    noise: Object.fromEntries(
      prohibitedNoise.map((copy) => [copy, occurrenceCount(visibleCodeText, copy)]),
    ),
  },
  coverage: {
    parseError: coverageError,
    topLevelKeys: coverage ? Object.keys(coverage) : [],
    declaredSurfaceCount: Array.isArray(coverage?.surfaces || coverage?.surfaceDispositions)
      ? (coverage.surfaces || coverage.surfaceDispositions).length
      : null,
    declaredControlCount: coverageControlSet.size,
    missingControls: coverageMissingControls,
    extraControls: coverageExtraControls,
    unresolvedItems: Array.isArray(coverage?.unresolvedItems) ? coverage.unresolvedItems.length : null,
  },
  markers,
  sensitiveDataPersisted: false,
}, null, 2));
