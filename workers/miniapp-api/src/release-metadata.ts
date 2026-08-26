export type StarwardEnvironment = "local" | "staging" | "production";

export interface ReleaseMetadata {
  environment: StarwardEnvironment;
  revision: string;
  imageDigest: string;
  releasedAt: string;
}

function selected(name: string, environment: NodeJS.ProcessEnv) {
  const value = environment[name]?.trim();
  return value ? value : null;
}

function required(name: string, environment: NodeJS.ProcessEnv) {
  const value = selected(name, environment);
  if (!value) throw new Error(`release_metadata_required:${name}`);
  if (value.startsWith("secret-ref:"))
    throw new Error(`release_metadata_unresolved:${name}`);
  return value;
}

export function loadReleaseMetadata(
  environment: NodeJS.ProcessEnv = process.env,
): ReleaseMetadata {
  const deploymentEnvironment = (
    selected("STARWARD_ENVIRONMENT", environment) ?? "local"
  ).toLowerCase();
  if (!(["local", "staging", "production"] as const).includes(
    deploymentEnvironment as StarwardEnvironment,
  ))
    throw new Error(
      `release_metadata_invalid:STARWARD_ENVIRONMENT:${deploymentEnvironment}`,
    );
  const starwardEnvironment = deploymentEnvironment as StarwardEnvironment;
  if (starwardEnvironment === "local")
    return {
      environment: "local",
      revision: selected("STARWARD_RELEASE_REVISION", environment) ?? "development",
      imageDigest: selected("STARWARD_IMAGE_DIGEST", environment) ?? "unbuilt",
      releasedAt:
        selected("STARWARD_RELEASED_AT", environment) ??
        "1970-01-01T00:00:00.000Z",
    };

  const revision = required("STARWARD_RELEASE_REVISION", environment);
  if (!/^[0-9a-f]{40}$/u.test(revision))
    throw new Error("release_metadata_invalid:STARWARD_RELEASE_REVISION");
  const imageDigest = required("STARWARD_IMAGE_DIGEST", environment);
  if (!/^sha256:[0-9a-f]{64}$/u.test(imageDigest))
    throw new Error("release_metadata_invalid:STARWARD_IMAGE_DIGEST");
  const releasedAt = required("STARWARD_RELEASED_AT", environment);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(releasedAt) ||
    !Number.isFinite(Date.parse(releasedAt))
  )
    throw new Error("release_metadata_invalid:STARWARD_RELEASED_AT");
  return {
    environment: starwardEnvironment,
    revision,
    imageDigest,
    releasedAt,
  };
}

export function loadHttpDeploymentConfig(
  metadata: ReleaseMetadata,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const rawOrigins = selected("MINIAPP_CORS_ORIGINS", environment);
  const origins = rawOrigins
    ? rawOrigins.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error("http_deployment_config_invalid:MINIAPP_CORS_ORIGINS");
  }
  if (metadata.environment !== "local" && origins.length === 0)
    throw new Error("http_deployment_config_required:MINIAPP_CORS_ORIGINS");
  if (metadata.environment !== "local" && selected("MINIAPP_TRUST_PROXY_HOPS", environment))
    throw new Error("http_deployment_config_forbidden:MINIAPP_TRUST_PROXY_HOPS");
  const rawProxyCidrs = selected("MINIAPP_TRUST_PROXY_CIDRS", environment);
  const trustedProxyCidrs = rawProxyCidrs
    ? rawProxyCidrs.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  for (const cidr of trustedProxyCidrs) {
    const [address, prefix, extra] = cidr.split("/");
    if (extra !== undefined || isIP(address ?? "") !== 4 || prefix !== "32")
      throw new Error("http_deployment_config_invalid:MINIAPP_TRUST_PROXY_CIDRS");
  }
  if (new Set(trustedProxyCidrs).size !== trustedProxyCidrs.length)
    throw new Error("http_deployment_config_invalid:MINIAPP_TRUST_PROXY_CIDRS");
  if (metadata.environment !== "local" && trustedProxyCidrs.length !== 1)
    throw new Error("http_deployment_config_required:MINIAPP_TRUST_PROXY_CIDRS");
  return Object.freeze({ origins, trustedProxyCidrs: Object.freeze(trustedProxyCidrs) });
}

export function fastifyDeploymentOptions(http: ReturnType<typeof loadHttpDeploymentConfig>) {
  return Object.freeze({
    bodyLimit: 2_000_000,
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
    handlerTimeout: 30_000,
    keepAliveTimeout: 10_000,
    maxRequestsPerSocket: 1_000,
    forceCloseConnections: "idle" as const,
    trustProxy: http.trustedProxyCidrs.length === 0 ? false : [...http.trustedProxyCidrs],
  });
}
import { isIP } from "node:net";
