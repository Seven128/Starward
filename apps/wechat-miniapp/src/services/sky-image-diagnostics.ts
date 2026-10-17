import { reportRuntimeError } from "./runtime-error";

/** Public resource identities and fixed failure codes only. Native errors may
 * contain local paths, signed URLs or credentials and must not be printed raw. */
export function reportSkyImageError(stage: "availability" | "load" | "render", resource: string, cause?: unknown): void {
  let candidate = "";
  try { const message = (cause as { message?: unknown } | null)?.message; if (typeof message === "string") candidate = message; }
  catch { /* Native/foreign error fields are optional and untrusted. */ }
  const code = /^(?:sky_|body_image_)[a-z0-9_]{1,120}$/.test(candidate) ? candidate : `sky_image_${stage}_failed`;
  const identity = /^[A-Za-z0-9_:.-]{1,160}$/.test(resource) ? resource : "image";
  reportRuntimeError("image", code, cause, { stage, resource: identity });
}
