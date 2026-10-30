import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_COMPILED_RUNTIME_CHUNKS } from './compiled-sky-origin.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const WEAPP_PACKAGE_BYTE_LIMIT = 2 * 1024 * 1024;
export const WEAPP_AGGREGATE_BYTE_LIMIT = 20 * 1024 * 1024;
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

export function packageBudgetWithinLimits(
  packages,
  totalBytes,
  { perPackageBytes = 2 * 1024 * 1024, aggregateBytes = 20 * 1024 * 1024 } = {},
) {
  return totalBytes > 0 && totalBytes <= aggregateBytes &&
    Object.values(packages).every(({ bytes }) => bytes <= perPackageBytes);
}

export async function inspectCandidate({ bundleDirectory = "apps/wechat-miniapp/dist/weapp" } = {}) {
  const expectedRoutes = [
    "pages/map/index",
    "pages/my/index",
    "pages/auth/index",
    "spot/search/index",
    "spot/guides/index",
    "spot/field/index",
    "spot/plan/index",
    "spot/data-source/index",
    "sky/detail/index",
    "sky/sources/index",
    "content/article/detail/index",
    "content/plan/detail/index",
    "content/plan/list/index",
    "content/plan/edit/index",
    "content/achievement/index",
    "content/share/index",
    "content/event/list/index",
    "content/event/detail/index",
    "content/contribution/index",
    "content/spot-feedback/index",
    "content/settings/index",
  ];
  const project = await readJson("apps/wechat-miniapp/project.config.json");
  const appConfig = await readJson(`${bundleDirectory}/app.json`).catch(() => null);
  const weappFiles = await listFiles(bundleDirectory);
  const sizes = await Promise.all(
    weappFiles.map(async (file) => ({
      file,
      size: (await stat(repositoryPath(file))).size,
    })),
  );
  const totalBytes = sizes.reduce((sum, item) => sum + item.size, 0);
  const routes = [
    ...(appConfig?.pages ?? []),
    ...(appConfig?.subPackages ?? []).flatMap((item) =>
      item.pages.map((page) => `${item.root}/${page}`),
    ),
  ];
  const routeCount = routes.length;
  const packages = summarizePackageBytes(
    sizes.map(({ file, size }) => ({
      file: path.relative(repositoryPath(bundleDirectory), repositoryPath(file)),
      size,
    })),
    appConfig?.subPackages ?? [],
  );
  const packageByteLimit = WEAPP_PACKAGE_BYTE_LIMIT;
  const aggregateByteLimit = WEAPP_AGGREGATE_BYTE_LIMIT;
  const packageBudgetPassed = packageBudgetWithinLimits(packages, totalBytes, {
    perPackageBytes: packageByteLimit,
    aggregateBytes: aggregateByteLimit,
  });
  const routeTopologyMatches =
    routes.length === expectedRoutes.length &&
    routes.every((route, index) => route === expectedRoutes[index]);
  const checks = {
    native_project:
      project.compileType === "miniprogram" &&
      project.miniprogramRoot === "dist/weapp/" &&
      routeTopologyMatches,
    package_budget: packageBudgetPassed,
    // Taro can emit every route wrapper while an entry-cache failure removes
    // the actual application modules. Reuse the release owner's required
    // shared chunks; route filenames alone cannot qualify that output.
    compiled_runtime_files: ["app.js", ...REQUIRED_COMPILED_RUNTIME_CHUNKS].every((name) =>
      sizes.some(({ file, size }) => size > 0 &&
        path.relative(repositoryPath(bundleDirectory), repositoryPath(file)).replaceAll("\\", "/") === name),
    ),
    route_files:
      routeTopologyMatches &&
      expectedRoutes.every((route) =>
        weappFiles.some((file) => file.endsWith(`${route}.js`)),
      ) &&
      !weappFiles.some((file) =>
        /(?:content\/profile\/links|content\/import)\/index\.js$/u.test(file),
      ),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    route_count: routeCount,
    routes,
    weapp_total_bytes: totalBytes,
    packages,
    package_limits: {
      per_package_bytes: packageByteLimit,
      aggregate_bytes: aggregateByteLimit,
    },
    bundle_directory: bundleDirectory,
    package_measurement: "Raw local output including source maps. Each main/subpackage is checked against 2 MiB and their aggregate against 20 MiB; DevTools remains the upload-package authority.",
  };
}


if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await inspectCandidate();
  process.stdout.write(JSON.stringify({ ...result, limitations: 'Static production bundle inspection only; no visual, device or persistence acceptance claim.' }) + '\n');
  process.exitCode = result.passed ? 0 : 1;
}
