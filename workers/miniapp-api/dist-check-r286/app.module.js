var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { AdminOperationsController } from "./admin-operations.controller.js";
import { AdminPublicationController } from "./admin-publication.controller.js";
import { AdminEventCatalogController } from "./admin-event-catalog.controller.js";
import { AcceptanceController } from "./acceptance.controller.js";
import { MiniappController } from "./controller.js";
import { StellarCatalogController } from "./stellar-catalog.controller.js";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.js";
import { SaoPublicationService } from "./sao-publication.js";
import { SaoPublicationController } from "./sao-publication.controller.js";
import { ConstellationController } from "./constellation.controller.js";
import { ConstellationPublicationService } from "./constellation-publication.js";
import { HealthController, RELEASE_METADATA } from "./health.controller.js";
import { MiniappService } from "./miniapp-service.js";
import { loadReleaseMetadata } from "./release-metadata.js";
const controllers = [
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map