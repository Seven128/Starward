import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export function feedbackFail(code) {
  throw new Error(`device_feedback_${code}`);
}
export function inside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function samePath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

export async function canonicalDirectory(value) {
  if (!value || !path.isAbsolute(value))
    feedbackFail("absolute_directory_required");
  let canonical;
  try {
    canonical = await realpath(value);
  } catch {
    feedbackFail("directory_unavailable");
  }
  if (
    !samePath(path.resolve(value), canonical) ||
    (await lstat(value)).isSymbolicLink()
  )
    feedbackFail("physical_directory_required");
  return canonical;
}

export function generationDirectory(run, generation) {
  const value = generation?.directory;
  if (
    !value ||
    !path.isAbsolute(value) ||
    !inside(run.directory, value) ||
    !/^generation-\d{6}-[\w-]+$/u.test(path.basename(value))
  )
    feedbackFail("generation_directory_invalid");
  return value;
}

export function deviceSessionDirectory(run, session) {
  if (
    !session ||
    !path.isAbsolute(session) ||
    !inside(run.directory, session) ||
    !/^starward-device-test-[\w-]+$/u.test(path.basename(session))
  )
    feedbackFail("device_session_invalid");
  return session;
}
