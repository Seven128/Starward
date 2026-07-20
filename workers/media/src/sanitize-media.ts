export interface MediaUpload { id: string; originalObjectKey: string; shortLivedCredentialExpiresAt: string; metadata: Record<string, unknown>; userConfirmed: { capturedAt?: string; directionDeg?: number; cameraSettings?: string } }
const sensitive = /gps|latitude|longitude|serial|owner|deviceid|location/i;

export function sanitizeMedia(input: MediaUpload, scan: { malware: boolean; ownershipAccepted: boolean }) {
  const publicMetadata = Object.fromEntries(Object.entries(input.metadata).filter(([key]) => !sensitive.test(key)));
  const processingPassed = !scan.malware && scan.ownershipAccepted;
  return {
    id: input.id,
    original: { objectKey: input.originalObjectKey, access: "moderator-only", immutable: true },
    derivative: processingPassed ? { objectKey: `public/${input.id}.webp`, metadata: { ...publicMetadata, ...input.userConfirmed }, exifSanitized: true } : null,
    state: processingPassed ? "review" : "quarantined",
    publiclyVisible: false,
    uploadConfirmed: true,
    moderationApproved: false,
  };
}
