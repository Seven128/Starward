import { describe, expect, it } from "vitest";
import { sanitizeMedia } from "./sanitize-media";
describe("media privacy pipeline", () => {
  it("removes sensitive EXIF and does not equate upload with publication", () => {
    const result = sanitizeMedia({ id: "m1", originalObjectKey: "private/m1.jpg", shortLivedCredentialExpiresAt: "soon", metadata: { GPSLatitude: 22.529, SerialNumber: "secret", ExposureTime: "10s" }, userConfirmed: { directionDeg: 180 } }, { malware: false, ownershipAccepted: true });
    expect(result.derivative?.metadata).not.toHaveProperty("GPSLatitude"); expect(result.publiclyVisible).toBe(false); expect(result.state).toBe("review");
  });
  it("quarantines processing failures", () => {
    expect(sanitizeMedia({ id: "m2", originalObjectKey: "private/m2.jpg", shortLivedCredentialExpiresAt: "soon", metadata: {}, userConfirmed: {} }, { malware: true, ownershipAccepted: true }).derivative).toBeNull();
  });
});
