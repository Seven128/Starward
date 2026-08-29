import { feedbackFail as fail } from "./device-feedback-paths.mjs";

export function errorCode(error) {
  const value = String(error?.message ?? error);
  return /^(?:device_feedback|device_test|release_bundle)_[a-z0-9_]+$/u.test(
    value,
  )
    ? value
    : "device_feedback_operation_failed";
}

export function parseArguments(argv) {
  const [action = "help", ...rest] = argv;
  const specifications = {
    help: { required: [], optional: [] },
    doctor: { required: [], optional: ["cli"] },
    start: { required: ["project"], optional: ["cli", "port"] },
    refresh: { required: ["feedback"], optional: ["cli", "port"] },
    preview: { required: ["feedback"], optional: ["cli", "port"] },
    bind: { required: ["feedback", "confirm"], optional: [] },
    stop: { required: ["feedback"], optional: [] },
  };
  const specification = specifications[action];
  if (!specification) fail("action_invalid");
  const allowed = [...specification.required, ...specification.optional];
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const token = rest[index];
    const value = rest[index + 1];
    const key = token?.startsWith("--") ? token.slice(2) : "";
    if (
      !key ||
      !allowed.includes(key) ||
      options[key] !== undefined ||
      value === undefined ||
      value === ""
    )
      fail("argument_invalid");
    options[key] = value;
  }
  if (specification.required.some((key) => options[key] === undefined))
    fail("argument_missing");
  if (options.port !== undefined) {
    const port = Number(options.port);
    if (!Number.isInteger(port) || port < 1 || port > 65_535)
      fail("port_invalid");
    options.port = port;
  }
  return { action, options };
}
