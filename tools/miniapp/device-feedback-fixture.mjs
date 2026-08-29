import {
  lstat,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  writeFixtureBase,
  writeFixtureVariant,
} from "./device-feedback-fixture-content.mjs";

const repository = path.resolve(import.meta.dirname, "../..");
const schema = "starward-miniapp-device-feedback-fixture-v1";

function fail(code) {
  throw new Error(`device_feedback_fixture_${code}`);
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function samePath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function parseArguments(argv) {
  const [action = "help", ...rest] = argv;
  const required = {
    help: [],
    create: ["variant"],
    update: ["project", "variant"],
    stop: ["project"],
  }[action];
  if (!required) fail("action_invalid");
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const token = rest[index];
    const key = token?.startsWith("--") ? token.slice(2) : "";
    const value = rest[index + 1];
    if (
      !required.includes(key) ||
      options[key] !== undefined ||
      !value
    )
      fail("argument_invalid");
    options[key] = value;
  }
  if (required.some((key) => options[key] === undefined))
    fail("argument_missing");
  if (options.variant && !["A", "B"].includes(options.variant))
    fail("variant_invalid");
  return { action, options };
}

async function currentAppId() {
  let config;
  try {
    config = JSON.parse(
      await readFile(
        path.join(
          repository,
          "apps",
          "wechat-miniapp",
          "project.config.json",
        ),
        "utf8",
      ),
    );
  } catch {
    fail("source_project_config_invalid");
  }
  if (!/^wx[a-f0-9]{16}$/u.test(config?.appid ?? ""))
    fail("source_app_id_invalid");
  return config.appid;
}

async function saveState(state) {
  await writeFile(
    path.join(state.directory, ".starward-device-feedback-fixture.json"),
    `${JSON.stringify(state, null, 2)}\n`,
    { mode: 0o600 },
  );
}

async function loadFixture(value) {
  if (!value || !path.isAbsolute(value)) fail("absolute_project_required");
  const temporary = await realpath(os.tmpdir());
  let canonical;
  try {
    canonical = await realpath(value);
  } catch {
    fail("project_unavailable");
  }
  if (
    !samePath(canonical, path.resolve(value)) ||
    (await lstat(value)).isSymbolicLink() ||
    !inside(temporary, canonical) ||
    !/^starward-device-feedback-fixture-[\w-]+$/u.test(
      path.basename(canonical),
    )
  )
    fail("owned_project_required");
  const marker = path.join(
    canonical,
    ".starward-device-feedback-fixture.json",
  );
  let state;
  try {
    if ((await lstat(marker)).isSymbolicLink()) fail("marker_symlink");
    state = JSON.parse(await readFile(marker, "utf8"));
  } catch (error) {
    if (String(error?.message ?? error).startsWith("device_feedback_fixture_"))
      throw error;
    fail("marker_invalid");
  }
  if (
    state?.schema !== schema ||
    !samePath(state.directory ?? "", canonical) ||
    !["A", "B"].includes(state.variant)
  )
    fail("marker_invalid");
  return state;
}

async function withFixture(value, callback) {
  const state = await loadFixture(value);
  const lockPath = path.join(state.directory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch {
    fail("project_busy");
  }
  try {
    return await callback(state);
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

async function writeVariant(state, variant) {
  await writeFixtureVariant(state.directory, variant);
  state.variant = variant;
  state.updatedAt = new Date().toISOString();
  await saveState(state);
}

async function createFixture(variant) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "starward-device-feedback-fixture-"),
  );
  try {
    await writeFixtureBase(directory, await currentAppId());
    const state = {
      schema,
      directory,
      variant,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    await writeVariant(state, variant);
    return state;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function stopFixture(value) {
  const state = await loadFixture(value);
  const lockPath = path.join(state.directory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch {
    fail("project_busy");
  }
  await lock.close();
  await rm(state.directory, { recursive: true });
}

export async function main(
  argv,
  { emit = (value) => console.log(JSON.stringify(value)) } = {},
) {
  const { action, options } = parseArguments(argv);
  if (action === "help") {
    emit({
      mode: "development_feedback_fixture",
      commands: [
        "create --variant A|B",
        "update --project <owned fixture> --variant A|B",
        "stop --project <owned fixture>",
      ],
      productBuildReferenced: false,
    });
    return;
  }
  if (action === "create") {
    const state = await createFixture(options.variant);
    emit({
      mode: "development_feedback_fixture",
      project: state.directory,
      variant: state.variant,
      productBuildReferenced: false,
      cleanup: "owned_fixture_pending",
    });
    return;
  }
  if (action === "update") {
    const state = await withFixture(options.project, async (loaded) => {
      await writeVariant(loaded, options.variant);
      return loaded;
    });
    emit({
      mode: "development_feedback_fixture",
      project: state.directory,
      variant: state.variant,
      productBuildReferenced: false,
      cleanup: "owned_fixture_pending",
    });
    return;
  }
  if (action === "stop") {
    await stopFixture(options.project);
    emit({
      mode: "development_feedback_fixture",
      stopped: true,
      productBuildChanged: false,
      cleanup: "owned_fixture_removed",
    });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    const message = String(error?.message ?? error);
    process.stderr.write(
      `${JSON.stringify({
        mode: "development_feedback_fixture",
        error: /^device_feedback_fixture_[a-z0-9_]+$/u.test(message)
          ? message
          : "device_feedback_fixture_operation_failed",
      })}\n`,
    );
    process.exitCode = 1;
  });
}
