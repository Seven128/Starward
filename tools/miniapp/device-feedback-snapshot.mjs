import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fingerprintBundle } from "./release-bundle-artifact.mjs";
import {
  canonicalDirectory,
  feedbackFail as fail,
  inside,
  samePath,
} from "./device-feedback-paths.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJson(value[key])]),
  );
}

export function semanticConfigSha256(config) {
  return sha256(Buffer.from(JSON.stringify(canonicalJson(config)), "utf8"));
}

function preparedProjectConfig(config) {
  const prepared = { ...config };
  delete prepared.srcMiniprogramRoot;
  if (
    prepared.setting &&
    typeof prepared.setting === "object" &&
    !Array.isArray(prepared.setting)
  ) {
    prepared.setting = { ...prepared.setting };
    delete prepared.setting.useCompilerPlugins;
  }
  return prepared;
}

function serializeProjectConfig(config) {
  return Buffer.from(`${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function readProjectConfig(configPath) {
  let configBytes;
  let config;
  try {
    if ((await lstat(configPath)).isSymbolicLink()) fail("project_config_symlink");
    configBytes = await readFile(configPath);
    config = JSON.parse(configBytes.toString("utf8"));
  } catch (error) {
    if (String(error?.message ?? error).startsWith("device_feedback_")) throw error;
    fail("project_config_invalid");
  }
  return { configBytes, config };
}

function validateProjectConfig(config) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    config.compileType !== "miniprogram" ||
    !/^wx[a-f0-9]{16}$/u.test(config.appid ?? "")
  )
    fail("miniapp_project_required");
  const miniprogramRoot = config.miniprogramRoot;
  if (
    typeof miniprogramRoot !== "string" ||
    !miniprogramRoot.trim() ||
    path.isAbsolute(miniprogramRoot)
  )
    fail("bundle_root_invalid");
  return miniprogramRoot;
}

export async function sourceBinding(project) {
  const canonical = await canonicalDirectory(project);
  const configPath = path.join(canonical, "project.config.json");
  const { configBytes, config } = await readProjectConfig(configPath);
  const miniprogramRoot = validateProjectConfig(config);
  const bundlePath = path.resolve(canonical, miniprogramRoot);
  if (!inside(canonical, bundlePath) || samePath(canonical, bundlePath))
    fail("separate_bundle_root_required");
  const bundle = await canonicalDirectory(bundlePath);
  if (!inside(canonical, bundle)) fail("bundle_outside_project");
  try {
    await readFile(path.join(bundle, "app.json"));
  } catch {
    fail("bundle_app_json_required");
  }
  const preparedConfig = preparedProjectConfig(config);
  const preparedConfigBytes = serializeProjectConfig(preparedConfig);
  return {
    project: canonical,
    configPath,
    config,
    configBytes,
    configSha256: sha256(configBytes),
    configSemanticSha256: semanticConfigSha256(config),
    preparedConfig,
    preparedConfigBytes,
    preparedConfigSha256: sha256(preparedConfigBytes),
    preparedConfigSemanticSha256: semanticConfigSha256(preparedConfig),
    miniprogramRoot,
    bundle,
  };
}

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) fail("bundle_symlink_forbidden");
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await copyFile(from, to);
    else fail("bundle_entry_unsupported");
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sourceSnapshot(binding) {
  const current = await sourceBinding(binding.project);
  const bundle = await fingerprintBundle(current.bundle);
  return {
    configSha256: current.configSha256,
    configSemanticSha256: current.configSemanticSha256,
    bundle,
  };
}

function sourceSnapshotsMatch(left, right) {
  return (
    left.configSha256 === right.configSha256 &&
    left.configSemanticSha256 === right.configSemanticSha256 &&
    left.bundle.sha256 === right.bundle.sha256 &&
    left.bundle.fileCount === right.bundle.fileCount &&
    left.bundle.totalBytes === right.bundle.totalBytes
  );
}

function bundlesMatch(left, right) {
  return (
    left.sha256 === right.sha256 &&
    left.fileCount === right.fileCount &&
    left.totalBytes === right.totalBytes
  );
}

export async function createStableGeneration(
  run,
  { attempts = 6, settleMilliseconds = 250, afterCopy } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20)
    fail("stability_attempts_invalid");
  if (
    !Number.isInteger(settleMilliseconds) ||
    settleMilliseconds < 0 ||
    settleMilliseconds > 5_000
  )
    fail("stability_wait_invalid");
  const number = run.nextGeneration;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const binding = await sourceBinding(run.sourceProject);
    const before = await sourceSnapshot(binding);
    if (settleMilliseconds > 0) await sleep(settleMilliseconds);
    const settled = await sourceSnapshot(binding);
    if (
      !sourceSnapshotsMatch(before, settled) ||
      binding.configSha256 !== settled.configSha256 ||
      binding.configSemanticSha256 !== settled.configSemanticSha256
    )
      continue;

    const directory = await mkdtemp(
      path.join(run.directory, `generation-${String(number).padStart(6, "0")}-`),
    );
    const project = path.join(directory, "project");
    const bundle = path.resolve(project, binding.miniprogramRoot);
    let keep = false;
    try {
      await mkdir(project, { recursive: true });
      await writeFile(
        path.join(project, "project.config.json"),
        binding.preparedConfigBytes,
      );
      await copyTree(binding.bundle, bundle);
      await afterCopy?.({ attempt, binding, directory, project, bundle });
      const after = await sourceSnapshot(binding);
      const preparedBinding = await sourceBinding(project);
      const copiedConfig = await readFile(preparedBinding.configPath);
      const copiedBundle = await fingerprintBundle(preparedBinding.bundle);
      if (
        sourceSnapshotsMatch(settled, after) &&
        bundlesMatch(settled.bundle, copiedBundle) &&
        copiedConfig.equals(binding.preparedConfigBytes)
      ) {
        keep = true;
        return {
          number,
          directory,
          project,
          bundleSha256: copiedBundle.sha256,
          fileCount: copiedBundle.fileCount,
          totalBytes: copiedBundle.totalBytes,
          configSha256: preparedBinding.configSha256,
          configSemanticSha256: preparedBinding.configSemanticSha256,
          sourceConfigSha256: settled.configSha256,
          sourceConfigSemanticSha256: settled.configSemanticSha256,
          preparedConfigSha256: preparedBinding.configSha256,
          preparedConfigSemanticSha256: preparedBinding.configSemanticSha256,
          createdAt: new Date().toISOString(),
        };
      }
    } finally {
      if (!keep) await rm(directory, { recursive: true, force: true });
    }
  }
  fail("source_not_stable");
}

export async function assertGenerationCurrent(run) {
  if (!run.generation) fail("generation_required");
  const prepared = await sourceBinding(run.generation.project);
  const bundle = await fingerprintBundle(prepared.bundle);
  if (
    bundle.sha256 !== run.generation.bundleSha256 ||
    bundle.fileCount !== run.generation.fileCount ||
    bundle.totalBytes !== run.generation.totalBytes
  )
    fail("generation_changed_start_new_preview");

  if (
    typeof run.generation.sourceConfigSha256 !== "string" ||
    typeof run.generation.sourceConfigSemanticSha256 !== "string" ||
    typeof run.generation.preparedConfigSha256 !== "string" ||
    typeof run.generation.preparedConfigSemanticSha256 !== "string"
  )
    fail("generation_config_changed_start_new_preview");
  const source = await sourceBinding(run.sourceProject);
  if (
    source.configSemanticSha256 !== run.generation.sourceConfigSemanticSha256 ||
    prepared.configSemanticSha256 !==
      run.generation.preparedConfigSemanticSha256
  )
    fail("generation_config_changed_start_new_preview");

  // DevTools may rewrite project.config.json's whitespace while preparing a
  // preview.  Keep the recorded byte digests as the generation identity, but
  // compare the live files by canonical JSON so formatting-only rewrites do
  // not invalidate an otherwise unchanged candidate.
  return {
    bundleSha256: bundle.sha256,
    fileCount: bundle.fileCount,
    totalBytes: bundle.totalBytes,
    configSha256: run.generation.preparedConfigSha256,
    configSemanticSha256: run.generation.preparedConfigSemanticSha256,
    sourceConfigSha256: run.generation.sourceConfigSha256,
    sourceConfigSemanticSha256: run.generation.sourceConfigSemanticSha256,
    preparedConfigSha256: run.generation.preparedConfigSha256,
    preparedConfigSemanticSha256: run.generation.preparedConfigSemanticSha256,
  };
}
