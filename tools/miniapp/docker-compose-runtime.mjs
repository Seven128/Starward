export function dockerComposeInvocation(args, platform = process.platform) {
  if (!Array.isArray(args) || args.some((value) => typeof value !== "string"))
    throw new Error("docker_compose_arguments_invalid");
  return platform === "win32"
    ? { command: "docker-compose", args: [...args] }
    : { command: "docker", args: ["compose", ...args] };
}
