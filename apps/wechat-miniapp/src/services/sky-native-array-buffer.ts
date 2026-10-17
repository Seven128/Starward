const byteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength")!.get!;

/** Native callbacks may return a buffer from another execution realm. Check
 * the intrinsic binary brand, without copying bytes or trusting a spoofable
 * tag/constructor. Views, shared buffers and detached buffers are not admitted. */
export function skyNativeArrayBuffer(value: unknown): ArrayBuffer | null {
  try {
    byteLength.call(value);
    new Uint8Array(value as ArrayBuffer, 0, 0); // Reject a detached backing store.
    return value as ArrayBuffer;
  } catch {
    return null;
  }
}
