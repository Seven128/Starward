import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryPath = relative => path.join(root, relative);
const readJson = async relative => JSON.parse(await readFile(repositoryPath(relative), 'utf8'));
async function listFiles(relative, predicate = () => true) {
  const base = repositoryPath(relative);
  const rows = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const repoRelative = path
          .relative(root, absolute)
          .replaceAll("\\", "/");
        if (predicate(repoRelative)) rows.push(repoRelative);
      }
    }
  }
  if ((await stat(base).catch(() => null))?.isDirectory()) await visit(base);
  return rows.sort();
}

export function summarizePackageBytes(files, subPackages = []) {
  const roots = subPackages.map(item => item.root.replace(/\/$/u, '')).sort((a,b) => b.length-a.length);
  const packages = Object.fromEntries(['main', ...roots].map(root => [root, { bytes: 0, source_map_bytes: 0 }]));
  for (const { file, size } of files) {
    const relative = file.replaceAll('\\', '/').replace(/^apps\/wechat-miniapp\/dist\/weapp\//u, '');
    const owner = roots.find(root => relative.startsWith(root + '/')) ?? 'main';
    packages[owner].bytes += size;
    if (relative.endsWith('.map')) packages[owner].source_map_bytes += size;
  }
  return packages;
}

export async function inspectCandidate({ bundleDirectory = "apps/wechat-miniapp/dist/weapp" } = {}) {
  const expectedRouteCount = 14;
  const expectedFilterCount = 18;
  const project = await readJson("apps/wechat-miniapp/project.config.json");
  const appConfig = await readJson(
    `${bundleDirectory}/app.json`,
  ).catch(() => null);
  const contracts = await readFile(
    repositoryPath("packages/miniapp-contracts/src/filters.ts"),
    "utf8",
  );
  const catalog = await readFile(
    repositoryPath("packages/miniapp-contracts/src/catalog.ts"),
    "utf8",
  );
  const flags = await readFile(
    repositoryPath("packages/miniapp-contracts/src/feature-flags.ts"),
    "utf8",
  );
  const oneShotLocation = await readFile(
    repositoryPath("apps/wechat-miniapp/src/services/one-shot-location.ts"),
    "utf8",
  );
  const appStore = await readFile(
    repositoryPath("apps/wechat-miniapp/src/state/app-store.ts"),
    "utf8",
  );
  const mapPage = await readFile(
    repositoryPath("apps/wechat-miniapp/src/pages/map/index.tsx"),
    "utf8",
  );
  const cachePolicy = await readFile(
    repositoryPath("apps/wechat-miniapp/src/services/cache-policy.ts"),
    "utf8",
  );
  const appSources = await listFiles("apps/wechat-miniapp/src", (file) =>
    /\.(?:ts|tsx)$/u.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file),
  );
  const appText = (
    await Promise.all(
      appSources.map((file) => readFile(repositoryPath(file), "utf8")),
    )
  ).join("\n");
  const weappFiles = await listFiles(bundleDirectory);
  const sizes = await Promise.all(
    weappFiles.map(async (file) => ({
      file,
      size: (await stat(repositoryPath(file))).size,
    })),
  );
  const totalBytes = sizes.reduce((sum, item) => sum + item.size, 0);
  const routeCount =
    (appConfig?.pages?.length ?? 0) +
    (appConfig?.subPackages ?? []).reduce(
      (sum, item) => sum + item.pages.length,
      0,
    );
  const seedStart = catalog.indexOf(
    "const SEEDS: readonly OsmSpotSeed[] = Object.freeze([",
  );
  const seedEnd = seedStart < 0 ? -1 : catalog.indexOf("\n]);", seedStart);
  const seedBlock =
    seedStart < 0 || seedEnd < 0 ? "" : catalog.slice(seedStart, seedEnd + 4);
  const seedIds = [...seedBlock.matchAll(/^\s+id:\s*"([a-z0-9-]+)",$/gmu)].map(
    (match) => match[1],
  );
  const catalogProjectionBound =
    catalog.includes("spotId: `spot:${seed.id}` as SpotId") &&
    catalog.includes("SEEDS.map(toSpot)");
  const spotIds = catalogProjectionBound
    ? seedIds.map((seedId) => `spot:${seedId}`)
    : [];
  const filterIds = [...contracts.matchAll(/id:\s*"([^"]+)"/gu)].map(
    (match) => match[1],
  );
  const expectedFlags = [
    "GLOBAL_NIGHT_TAB_ENABLED",
    "ORDINARY_PLACE_SKY_ENABLED",
    "DARK_SKY_CANDIDATES_ENABLED",
    "SKY_EVENT_ENABLED",
    "REAL_WEATHER_ENABLED",
    "LAYERED_CLOUD_ENABLED",
    "WEATHER_MODEL_COMPARISON_ENABLED",
    "LIGHT_POLLUTION_LAYER_ENABLED",
    "SKY_OPPORTUNITY_LAYER_ENABLED",
    "DYNAMIC_SKY_MAP_ENABLED",
    "WECHAT_AUTH_ENABLED",
    "EVENT_SUBSCRIPTION_ENABLED",
    "PROFILE_LINKS_ENABLED",
    "OWN_POST_IMPORT_ENABLED",
  ];
  const checks = {
    native_project:
      project.compileType === "miniprogram" &&
      project.miniprogramRoot === "dist/weapp/" &&
      routeCount === expectedRouteCount,
    filter_population:
      filterIds.length === expectedFilterCount &&
      new Set(filterIds).size === filterIds.length,
    curated_spots:
      catalogProjectionBound &&
      spotIds.length === 26 &&
      new Set(spotIds).size === spotIds.length,
    capability_flags:
      expectedFlags.every((flag) => flags.includes(`"${flag}"`)) &&
      flags.includes("assertFeatureFlagClosure"),
    no_direct_provider: !/fetch\(\s*["'`]https?:\/\//u.test(appText),
    no_html_delivery:
      project.compileType === "miniprogram" &&
      !appText.includes("<iframe") &&
      !appText.includes("WebView"),
    recovery_semantics: [
      "PERMISSION_DENIED",
      "STALE",
      "PARTIAL",
      "ERROR",
      "EMPTY",
    ].every((state) => appText.includes(state)),
    explicit_location_only:
      !mapPage.includes("useLoad") &&
      mapPage.includes('from "@/services/one-shot-location"') &&
      mapPage.includes("requestOneShotLocation(Taro)") &&
      (oneShotLocation.match(/platform\.getLocation\(/gu) ?? []).length === 1 &&
      appStore.includes('locationState: "DEFAULT_REGION"'),
    response_cache_entity_identity:
      cachePolicy.includes("responseCacheKey") && cachePolicy.includes("path"),
    package_budget: totalBytes > 0 && totalBytes < 2 * 1024 * 1024,
    route_files:
      routeCount === expectedRouteCount &&
      weappFiles.some((file) => file.endsWith("pages/map/index.js")) &&
      weappFiles.some((file) => file.endsWith("content/import/index.js")),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    route_count: routeCount,
    spot_ids: spotIds,
    filter_ids: filterIds,
    weapp_total_bytes: totalBytes,
    packages: summarizePackageBytes(sizes.map(({ file, size }) => ({ file: path.relative(repositoryPath(bundleDirectory), repositoryPath(file)), size })), appConfig?.subPackages ?? []),
    bundle_directory: bundleDirectory,
    package_measurement: "Raw local output including any source maps; conservative aggregate budget, not DevTools upload package size. Use a non-watch build for candidate inspection.",
  };
}


if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await inspectCandidate();
  process.stdout.write(JSON.stringify({ ...result, limitations: 'Static production bundle inspection only; no visual, device or persistence acceptance claim.' }) + '\n');
  process.exitCode = result.passed ? 0 : 1;
}
