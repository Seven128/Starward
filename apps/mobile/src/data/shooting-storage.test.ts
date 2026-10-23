import { beforeEach, expect, it, vi } from "vitest";
import { saveShootingPlanVersion, type ShootingInput } from "@starward/domain/shooting";
const transport = vi.hoisted(() => ({ records: new Map<string, string>(), loseReply: false, readsFail: false }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: async (key: string) => { if (transport.readsFail) throw new Error("unavailable"); return transport.records.get(key) ?? null; },
  setItem: async (key: string, value: string) => { transport.records.set(key, value); if (transport.loseReply) throw new Error("reply_lost"); },
} }));
import { loadLocalShootingVersions, saveLocalShootingVersion } from "./shooting-storage";
const input: ShootingInput = { target: "milky-way", locationId: "fixture", scheduledAt: "2026-10-24T16:00:00.000Z", timezone: "Asia/Shanghai", acceptsStacking: true, experience: "intermediate", equipment: { kind: "camera", model: "fixture", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: 24, maxAperture: 2.8, tracker: false, tripod: true }, conditions: { capturedAt: "2026-10-23T08:00:00.000Z", sourceVersions: ["fixture"] } };
const version = () => saveShootingPlanVersion(null, input, {}, "2026-10-23T10:00:00.000Z");
beforeEach(() => { transport.records.clear(); transport.loseReply = false; transport.readsFail = false; });

it("confirms an exact committed version after a lost reply and replays without replacing newer history", async () => {
  const first = version(); transport.loseReply = true;
  await expect(saveLocalShootingVersion(first)).resolves.toEqual([first]);
  transport.loseReply = false;
  const second = saveShootingPlanVersion(first, { ...input, scheduledAt: "2026-10-24T17:00:00.000Z" }, {}, "2026-10-23T10:01:00.000Z");
  await saveLocalShootingVersion(second);
  await expect(saveLocalShootingVersion(first)).resolves.toEqual([first, second]);
  await expect(loadLocalShootingVersions()).resolves.toEqual([first, second]);
});

it("serializes this owner's concurrent writes and rejects different contents at the same version", async () => {
  const first = version(), changed = { ...first, input: { ...first.input, scheduledAt: "2026-10-24T17:00:00.000Z" } };
  const results = await Promise.allSettled([saveLocalShootingVersion(first), saveLocalShootingVersion(changed)]);
  expect(results[0].status).toBe("fulfilled");
  expect(results[1]).toMatchObject({ status: "rejected", reason: new Error("shooting_version_conflict") });
  await expect(loadLocalShootingVersions()).resolves.toEqual([first]);
  await expect(saveLocalShootingVersion({ ...first, revision: 4, previousRevision: 3 })).rejects.toThrow("shooting_version_conflict");
});

it("does not reset corrupt or unavailable historical storage", async () => {
  transport.records.set("starward-shooting-versions-v1", "{}");
  await expect(saveLocalShootingVersion(version())).rejects.toThrow("shooting_versions_invalid");
  expect(transport.records.get("starward-shooting-versions-v1")).toBe("{}");
  transport.readsFail = true;
  await expect(saveLocalShootingVersion(version())).rejects.toThrow("unavailable");
  expect(transport.records.get("starward-shooting-versions-v1")).toBe("{}");
});
