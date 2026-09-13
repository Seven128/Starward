export const connectionKeys = Object.freeze(["SSH_HOST", "SSH_PORT", "SSH_USER", "REMOTE_INBOX", "REMOTE_RELEASE_ROOT", "REMOTE_CANDIDATE_ROOT", "REMOTE_BASE_DEPLOY_ENV"]);

export function parseDeploymentConnection(packet) {
  let connection;
  try { connection = JSON.parse(packet); } catch { throw new Error("deployment_connection_invalid"); }
  if (!connection || Array.isArray(connection) || typeof connection !== "object" ||
    connectionKeys.some(name => typeof connection[name] !== "string") ||
    !/^[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(connection.SSH_HOST) ||
    !/^[A-Za-z0-9_][A-Za-z0-9._-]*$/u.test(connection.SSH_USER) ||
    !/^\d{1,5}$/u.test(connection.SSH_PORT) || Number(connection.SSH_PORT) < 1 || Number(connection.SSH_PORT) > 65535 ||
    connectionKeys.slice(3).some(name => !/^\/[A-Za-z0-9._/-]+$/u.test(connection[name]) || connection[name].split("/").includes("..")))
    throw new Error("deployment_connection_invalid");
  return Object.fromEntries(connectionKeys.map(name => [name, connection[name]]));
}
