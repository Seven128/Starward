import { Module, type Type } from "@nestjs/common";
import { AdminController } from "./admin.controller.ts";
import { AdminOperationsController } from "./admin-operations.controller.ts";
import { AdminPublicationController } from "./admin-publication.controller.ts";
import { AdminEventCatalogController } from "./admin-event-catalog.controller.ts";
import { AcceptanceController } from "./acceptance.controller.ts";
import { MiniappController } from "./controller.ts";
import { StellarCatalogController } from "./stellar-catalog.controller.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
import { SaoPublicationService } from "./sao-publication.ts";
import { SaoPublicationController } from "./sao-publication.controller.ts";
import { ConstellationController } from "./constellation.controller.ts";
import { ConstellationPublicationService } from "./constellation-publication.ts";
import { HealthController, RELEASE_METADATA } from "./health.controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { loadReleaseMetadata } from "./release-metadata.ts";

const controllers: Type<unknown>[] = [
  MiniappController,
  StellarCatalogController,
  SaoPublicationController,
  ConstellationController,
  AdminController,
  AdminOperationsController,
  AdminPublicationController,
  AdminEventCatalogController,
  HealthController,
];
if (process.env.MINIAPP_ACCEPTANCE_MODE === "1")
  controllers.push(AcceptanceController);

@Module({
  controllers,
  providers: [
    StellarCatalogPublicationService,
    SaoPublicationService,
    ConstellationPublicationService,
    {
      provide: RELEASE_METADATA,
      useFactory: () => loadReleaseMetadata(),
    },
    {
      provide: MiniappService,
      useFactory: () => MiniappService.createFromEnvironment(),
    },
  ],
})
export class AppModule {}
