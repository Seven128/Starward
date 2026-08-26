import { spawnSync } from "node:child_process";
import path from "node:path";

export function composeInvocation({ composePath, deployEnvPath, args }) {
  if (!path.isAbsolute(composePath))
    throw new Error("deployment_compose_path_must_be_absolute");
  if (!path.isAbsolute(deployEnvPath))
    throw new Error("deployment_env_path_must_be_absolute");
  if (!Array.isArray(args) || args.some((entry) => typeof entry !== "string"))
    throw new Error("deployment_compose_arguments_invalid");
  return Object.freeze({
    command: "docker",
    args: ["compose", "--env-file", deployEnvPath, "-f", composePath, ...args],
  });
}

export function runProcess({ command, args, cwd, input, maxBuffer = 16 * 1024 * 1024, step = "command" }) {
  const result = spawnSync(command, args, {
    cwd,
    input,
    encoding: null,
    maxBuffer,
    windowsHide: true,
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

export function composeExecutor({ composePath, deployEnvPath, cwd, execute = runProcess }) {
  return ({ args, input, maxBuffer, step }) => {
    const invocation = composeInvocation({ composePath, deployEnvPath, args });
    return execute({ ...invocation, cwd, input, maxBuffer, step });
  };
}
