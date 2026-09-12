export const WECHAT_AUTOMATOR_OPAQUE_ERROR_ENVELOPE_V1 = Object.freeze({
  id: "wechat_automator_opaque_error_envelope_v1",
  payload_sha256:
    "3114f3b3346bb53845fd85737e0fd5994b59b4513f98c035c560d2b5ba98f0b6",
  payload_length: 28,
  safe_excerpt: '{"type":"error","args":[{}]}',
});

export function knownWechatToolchainConsoleErrorId(event) {
  const known = WECHAT_AUTOMATOR_OPAQUE_ERROR_ENVELOPE_V1;
  return event?.kind === "console" &&
    event?.level === "error" &&
    event?.payload_sha256 === known.payload_sha256 &&
    event?.payload_length === known.payload_length &&
    event?.safe_excerpt === known.safe_excerpt
    ? known.id
    : null;
}

export const WECHAT_TRANSIENT_NOT_FOUND_EXCEPTION_V1 = Object.freeze({
  id: "wechat_transient_not_found_exception_v1",
  phase: "evidence-startup",
  phases: Object.freeze(["setup-startup", "evidence-startup"]),
  message: 'Component is not found in path \\"wx://not-found\\".',
});

export function knownWechatToolchainExceptionId(event) {
  const known = WECHAT_TRANSIENT_NOT_FOUND_EXCEPTION_V1;
  return event?.kind === "exception" &&
    known.phases.includes(event?.phase) &&
    typeof event?.safe_excerpt === "string" &&
    event.safe_excerpt.includes(known.message)
    ? known.id
    : null;
}
