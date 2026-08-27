import { spawnSync } from "node:child_process";
import path from "node:path";

export function composeInvocation({ composePath, overlayPaths = [], deployEnvPath, args }) {
  if (!path.isAbsolute(composePath))
    throw new Error("deployment_compose_path_must_be_absolute");
  if (!path.isAbsolute(deployEnvPath))
    throw new Error("deployment_env_path_must_be_absolute");
  if (!Array.isArray(args) || args.some((entry) => typeof entry !== "string"))
    throw new Error("deployment_compose_arguments_invalid");
  if (!Array.isArray(overlayPaths) || overlayPaths.some((entry) => typeof entry !== "string" || !path.isAbsolute(entry)))
    throw new Error("deployment_compose_overlay_path_must_be_absolute");
  return Object.freeze({
    command: "docker",
    args: ["compose", "--env-file", deployEnvPath, "-f", composePath, ...overlayPaths.flatMap((entry) => ["-f", entry]), ...args],
  });
}

export function runProcess({ command, args, cwd, input, env = process.env, maxBuffer = 16 * 1024 * 1024, timeout = 1_800_000, step = "command" }) {
  const result = spawnSync(command, args, {
    cwd,
    input,
    env,
    encoding: null,
    maxBuffer,
    windowsHide: true,
    timeout,
  });
  if (result.error)
    throw new Error(`deployment_process_error:${step}:${result.error.code ?? "spawn"}`);
  if (result.status !== 0)
    throw new Error(`deployment_process_failed:${step}:${result.status ?? "signal"}`);
  return Object.freeze({
    stdout: Buffer.from(result.stdout ?? []),
    stderr: Buffer.from(result.stderr ?? []),
  });
}

export function composeExecutor({ composePath, overlayPaths = [], deployEnvPath, cwd, execute = runProcess }) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:STARWARD_|COMPOSE_)/u.test(key) && key !== "CADDY_EMAIL"));
  return ({ args, input, maxBuffer, step }) => {
    const invocation = composeInvocation({ composePath, overlayPaths, deployEnvPath, args });
    return execute({ ...invocation, cwd, input, env, maxBuffer, step });
  };
}
