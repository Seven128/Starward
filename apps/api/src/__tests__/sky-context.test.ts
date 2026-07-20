import { describe, expect, it } from "vitest";
import { parseSkyQuery } from "../../../../packages/contracts/src/sky";
import { createSkyContextHandler } from "../modules/sky/sky-context-handler";
import { SkyContextService } from "../modules/sky/sky-context-service";

const query = {
  latitude: "22.529", longitude: "113.9468", elevationM: "18", timezone: "Asia/Shanghai",
  at: "2026-08-12T16:40:00.000Z", target: "milky-way-core",
};

describe("sky context boundary", () => {
  it("validates WGS84, timezone, time and target inputs", () => {
    expect(parseSkyQuery(query)).toMatchObject({ latitude: 22.529, longitude: 113.9468, target: "milky-way-core" });
    expect(() => parseSkyQuery({ ...query, latitude: 91 })).toThrow("sky_latitude_invalid");
    expect(() => parseSkyQuery({ ...query, timezone: "Mars/Olympus" })).toThrow("sky_timezone_invalid");
    expect(() => parseSkyQuery({ ...query, at: "not-a-date" })).toThrow("sky_time_invalid");
  });

  it("computes positions and a 15-minute trajectory without inventing a site horizon", async () => {
    const service = new SkyContextService(() => new Date("2026-08-12T12:00:00.000Z"));
    const result = await service.get(parseSkyQuery(query));
    expect(result.objects.find((item) => item.id === "milky-way-core")).toBeTruthy();
    expect(result.trajectory).toHaveLength(97);
    expect(result.bestTargetTime).toMatch(/^2026-/u);
    expect(result.horizon).toBeNull();
    expect(result.warnings[0]).toContain("不推断");
  });

  it("returns a bounded client error for invalid queries", async () => {
    const handler = createSkyContextHandler(new SkyContextService());
    await expect(handler({ ...query, target: "invented" })).resolves.toMatchObject({ status: 400, body: { code: "sky_target_invalid" } });
  });
});
