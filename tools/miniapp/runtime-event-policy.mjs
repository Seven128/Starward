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
