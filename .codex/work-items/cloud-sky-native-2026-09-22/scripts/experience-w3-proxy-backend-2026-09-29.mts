// Task-only current Sky backend: one isolated Context owner plus real compiled
// publication controllers. No external provider or private Context transfer.
import "reflect-metadata";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "../../../../workers/miniapp-api/dist/controller.js";
import { MiniappService } from "../../../../workers/miniapp-api/dist/miniapp-service.js";
import { DeepSkyImageryService } from "../../../../workers/miniapp-api/dist/deep-sky-imagery.js";
import { SdssOpticalImageryService } from "../../../../workers/miniapp-api/dist/sdss-optical-imagery.js";
import { StellarCatalogController } from "../../../../workers/miniapp-api/dist/stellar-catalog.controller.js";
import { StellarCatalogPublicationService } from "../../../../workers/miniapp-api/dist/stellar-catalog-publication.js";
import { SaoPublicationController } from "../../../../workers/miniapp-api/dist/sao-publication.controller.js";
import { SaoPublicationService } from "../../../../workers/miniapp-api/dist/sao-publication.js";
import { ConstellationController } from "../../../../workers/miniapp-api/dist/constellation.controller.js";
import { ConstellationPublicationService } from "../../../../workers/miniapp-api/dist/constellation-publication.js";
import { ApiExceptionFilter } from "../../../../workers/miniapp-api/dist/api-exception.filter.js";
import { EtagInterceptor } from "../../../../workers/miniapp-api/dist/etag.interceptor.js";
import { createTestRuntimeConfig } from "../../../../workers/miniapp-api/dist/runtime-config.js";
import { createBsc5pSkyCatalogProvider } from "../../../../workers/miniapp-api/dist/sky-scene-catalog.js";
import { MemoryMediaObjectStore } from "../../../../workers/miniapp-api/dist/media-object-store.js";
import { DisabledPlaceSearchAdapter } from "../../../../workers/miniapp-api/dist/place-provider.js";
import { DisabledRouteAdapter } from "../../../../workers/miniapp-api/dist/route-provider.js";
import { InMemoryTestRepository } from "../../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts";
import { DeterministicWeatherTestAdapter } from "../../../../workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts";
import { SDSS_OPTICAL_PUBLICATIONS } from "@starward/miniapp-contracts";

export function usesCurrentPublication(method: string, relativeUrl: string) {
  if (method !== "GET" && method !== "HEAD") return false;
  const { pathname, searchParams } = new URL(relativeUrl, "http://127.0.0.1:8791");
  if (pathname.startsWith("/v2/sky/sdss-optical/")) return true;
  if (/^\/v2\/sky\/deep-sky\/[^/]+\/manifest$/u.test(pathname)) return true;
  if (/^\/v2\/celestial-objects\/[^/]+\/image$/u.test(pathname))
    return searchParams.has("imageVersion") || searchParams.has("publicationHash");
  return /^\/v2\/celestial-objects\/[^/]+$/u.test(pathname)
    && (searchParams.has("deepSkyImageVersion") || searchParams.has("deepSkyPublicationHash"));
}

export async function createPublicationBackend() {
  // Snapshot at module startup, never claim a later disk build is already loaded.
  const informationModuleSha256 = createHash("sha256").update(await readFile(new URL(
    "../../../../workers/miniapp-api/dist/celestial-object-information.js", import.meta.url))).digest("hex");
  // Only the owned diagnostic process can arm these bounded provider failures.
  // Real compiled services create the product response; no response rewriting,
  // source file changes or client hook/query-cache bypass is used.
  const sourceModes = new Set(["pass", "infrared-offline", "optical-offline", "both-offline"]);
  let sourceMode = "pass", sourceDeadline = 0;
  const sourceReads = { infrared: 0, optical: 0, infraredFailed: 0, opticalFailed: 0 };
  const activeSourceMode = () => {
    if (sourceDeadline && Date.now() >= sourceDeadline) { sourceMode = "pass"; sourceDeadline = 0; }
    return sourceMode;
  };
  class ControlledInfrared extends DeepSkyImageryService {
    override source(reference: string, selection = {}) {
      if (reference === "M:82") {
        sourceReads.infrared++;
        if (["infrared-offline", "both-offline"].includes(activeSourceMode())) {
          sourceReads.infraredFailed++;
          throw new Error("task_controlled_infrared_source_unavailable");
        }
      }
      return super.source(reference, selection);
    }
  }
  class ControlledOptical extends SdssOpticalImageryService {
    override source(reference: string) {
      if (reference === "M:82") {
        sourceReads.optical++;
        if (["optical-offline", "both-offline"].includes(activeSourceMode())) {
          sourceReads.opticalFailed++;
          throw new Error("task_controlled_optical_source_unavailable");
        }
      }
      return super.source(reference);
    }
  }
  const sourceStatus = () => ({ mode: activeSourceMode(), target: "M:82",
    deadlineUtc: sourceDeadline ? new Date(sourceDeadline).toISOString() : null, reads: { ...sourceReads },
    scope: "task-local source-provider exceptions, real compiled information response" });
  const setSourceMode = (value: string) => {
    if (!sourceModes.has(value)) throw new Error("invalid_task_source_mode");
    sourceMode = value; sourceDeadline = value === "pass" ? 0 : Date.now() + 120_000;
    return sourceStatus();
  };
  const service = new MiniappService({
    repository: new InMemoryTestRepository(), config: createTestRuntimeConfig(),
    weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter(),
    placeSearch: new DisabledPlaceSearchAdapter(), mediaStore: new MemoryMediaObjectStore(),
    skyCatalog: createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3"),
    deepSkyImages: new ControlledInfrared(), sdssOpticalImages: new ControlledOptical(),
  });
  class PublicationModule {}
  Module({ controllers: [MiniappController, StellarCatalogController, SaoPublicationController, ConstellationController],
    providers: [{ provide: MiniappService, useValue: service }, StellarCatalogPublicationService,
      SaoPublicationService, ConstellationPublicationService] })(PublicationModule);
  const app = await NestFactory.create(PublicationModule, new FastifyAdapter({ routerOptions: { maxParamLength: 256 } }), { logger: false });
  app.enableCors({ origin: [/^http:\/\/127\.0\.0\.1(?::\d+)?$/u], methods: ["GET", "HEAD"] });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new EtagInterceptor());
  try {
    // Read through the actual owner before exposing the local route.
    const detail = await service.deepSkyImages.get("M:42", "DETAIL", undefined, "source-finite-v3");
    const sdssPublications = [];
    for (const reference of Object.keys(SDSS_OPTICAL_PUBLICATIONS)) {
      const manifest = service.sdssOpticalImages.currentManifest(reference);
      await service.sdssOpticalImages.get(reference,"OVERVIEW",manifest.publicationHash);
      sdssPublications.push({reference,publicationHash:manifest.publicationHash});
    }
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpAdapter().getInstance().server.address();
    if (!address || typeof address === "string") throw new Error("task_publication_address_invalid");
    return { port: address.port, publicationHash: detail.publicationHash, sdssPublications,
      informationModuleSha256, sourceStatus, setSourceMode, close: () => app.close() };
  } catch (error) { await app.close(); throw error; }
}
