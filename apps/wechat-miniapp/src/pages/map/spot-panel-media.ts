import type { SpotSummary } from "@starward/miniapp-contracts";

export function mediaIsRenderable(
  media: SpotSummary["media"][number],
  allowSampleData = false,
) {
  return Boolean(
    media.state !== "EXPIRED" &&
      media.state !== "UNAVAILABLE" &&
      (allowSampleData || media.state !== "SAMPLE_DATA") &&
      media.license.trim() &&
      (media.thumbnailPath.trim() || media.localPath.trim()),
  );
}
