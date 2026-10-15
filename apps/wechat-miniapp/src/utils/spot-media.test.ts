import assert from "node:assert/strict";
import test from "node:test";
import type { RepresentativeMedia } from "@starward/miniapp-contracts";
import { facilityPhotos } from "./spot-media";

const photo = (id: string, patch: Partial<RepresentativeMedia> = {}): RepresentativeMedia => ({
  id, localPath: id + ".jpg", thumbnailPath: id + "-thumb.jpg", alt: id, caption: id,
  photographer: "owner", license: "Project-owned", licenseUrl: "", sourceUrl: "", capturedAt: null,
  direction: null, sequence: 0, isSiteSpecific: true, state: "FRESH", ...patch,
});

test("facility albums require explicit same-spot associations and retain their published order", () => {
  const media = [photo("scene"), photo("toilet"), photo("parking-2"), photo("parking-1")];
  const associations = { parking: ["parking-1", "parking-2", "parking-1"], toilet: ["toilet"] };
  assert.deepEqual(facilityPhotos("PARKING", media, associations).map(item => item.id), ["parking-1", "parking-2"]);
  assert.deepEqual(facilityPhotos("TOILET", media, associations).map(item => item.id), ["toilet"]);
  assert.deepEqual(facilityPhotos("PARKING", media, undefined), []);
  assert.deepEqual(facilityPhotos("PLATFORM", media, associations), []);
});

test("a facility photo cannot borrow a missing, unrelated, unlicensed or unavailable image", () => {
  const ids = { parking: ["missing", "expired", "unlicensed", "representative", "valid"] };
  const media = [photo("scene"), photo("expired", { state: "EXPIRED" }), photo("unlicensed", { license: " " }),
    photo("representative", { isSiteSpecific: false }), photo("valid")];
  assert.deepEqual(facilityPhotos("PARKING", media, ids).map(item => item.id), ["valid"]);
});
