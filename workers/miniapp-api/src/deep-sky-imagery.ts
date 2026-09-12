import { deepSkyRowByReference } from "@starward/astronomy-core";

export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export interface DeepSkyImageResult {
  bytes: Buffer;
  contentType: "image/jpeg";
  fieldDegrees: number;
  pixelSize: 256 | 512;
  sourceLabel: "NASA SkyView - WISE 12um";
}

interface CacheRow extends DeepSkyImageResult { expiresAt: number }

const SKYVIEW_IMAGES = "https://skyview.gsfc.nasa.gov/cgi-bin/images";
const MAX_BYTES = 4 * 1024 * 1024;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

function levelProfile(level: DeepSkyImageLevel, majorAxisArcmin: number | null) {
  const objectDegrees = Math.max(majorAxisArcmin ?? 10, 1) / 60;
  const settings = level === "OVERVIEW"
    ? { multiplier: 3, minimum: 2, maximum: 4, pixels: 256 as const }
    : level === "MEDIUM"
      ? { multiplier: 1.5, minimum: 0.75, maximum: 4, pixels: 512 as const }
      : { multiplier: 0.6, minimum: 0.25, maximum: 2, pixels: 512 as const };
  const fieldDegrees = Math.min(settings.maximum, Math.max(settings.minimum, objectDegrees * settings.multiplier));
  return { fieldDegrees: Math.round(fieldDegrees * 1_000) / 1_000, pixelSize: settings.pixels };
}

export function skyViewImageUrl(reference: string, level: DeepSkyImageLevel) {
  const row = deepSkyRowByReference(reference);
  if (!row) throw new Error("deep_sky_image_not_found");
  const profile = levelProfile(level, row.majorAxisArcmin);
  const query = new URLSearchParams({
    Position: `${row.raDeg},${row.decDeg}`,
    Survey: "WISE 12",
    Coordinates: "J2000",
    Projection: "Tan",
    Size: String(profile.fieldDegrees),
    Pixels: String(profile.pixelSize),
    Return: "JPEG",
    Scaling: "LogLog",
    Sampler: "Lanczos3",
  });
  return { url: `${SKYVIEW_IMAGES}?${query}`, ...profile };
}

function assertLevel(value: string): asserts value is DeepSkyImageLevel {
  if (value !== "OVERVIEW" && value !== "MEDIUM" && value !== "DETAIL")
    throw new Error("deep_sky_image_level_invalid");
}

export class DeepSkyImageryService {
  private readonly cache = new Map<string, CacheRow>();
  private readonly inFlight = new Map<string, Promise<DeepSkyImageResult>>();
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly transport: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async get(reference: string, levelInput = "MEDIUM"): Promise<DeepSkyImageResult> {
    assertLevel(levelInput);
    const key = `${reference}:${levelInput}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return { ...cached, bytes: Buffer.from(cached.bytes) };
    }
    if (cached) this.cache.delete(key);
    const existing = this.inFlight.get(key);
    if (existing) return existing.then((value) => ({ ...value, bytes: Buffer.from(value.bytes) }));
    const pending = this.fetchImage(reference, levelInput).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, pending);
    return pending.then((value) => ({ ...value, bytes: Buffer.from(value.bytes) }));
  }

  private async takeSlot() {
    if (this.active >= 2) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }

  private releaseSlot() {
    this.active -= 1;
    this.waiting.shift()?.();
  }

  private async fetchImage(reference: string, level: DeepSkyImageLevel): Promise<DeepSkyImageResult> {
    const request = skyViewImageUrl(reference, level);
    await this.takeSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await this.transport(request.url, {
        signal: controller.signal,
        headers: { accept: "image/jpeg" },
      });
      if (!response.ok) throw new Error("deep_sky_image_provider_unavailable");
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("image/jpeg")) throw new Error("deep_sky_image_provider_invalid_content_type");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 4 || bytes.length > MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
        bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
        throw new Error("deep_sky_image_provider_invalid_jpeg");
      const result: DeepSkyImageResult = {
        bytes,
        contentType: "image/jpeg",
        fieldDegrees: request.fieldDegrees,
        pixelSize: request.pixelSize,
        sourceLabel: "NASA SkyView - WISE 12um",
      };
      this.cache.set(`${reference}:${level}`, { ...result, bytes: Buffer.from(bytes), expiresAt: this.now() + CACHE_TTL_MS });
      while (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("deep_sky_image_")) throw error;
      throw new Error("deep_sky_image_provider_unavailable", { cause: error });
    } finally {
      clearTimeout(timeout);
      this.releaseSlot();
    }
  }
}
