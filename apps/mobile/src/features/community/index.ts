export const communityCapabilityBoundary = Object.freeze({
  productScope: ["spot", "field-report", "media", "multidimensional-review", "correction", "itinerary-share"],
  excludedSocialScope: ["generic-feed", "follow", "followers", "direct-message", "unrelated-post"],
  evidence: { immutable: true, adoptionCreatesVersion: true, transientUsesExpiresAt: true },
  media: { directUploadCredential: "short-lived", original: "moderator-only", publicAfterModeration: true, failClosed: true },
});
