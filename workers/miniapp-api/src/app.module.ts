import { Module, type Type } from "@nestjs/common";
import { AdminController } from "./admin.controller.ts";
import { AcceptanceController } from "./acceptance.controller.ts";
import { MiniappController } from "./controller.ts";
import { HealthController, RELEASE_METADATA } from "./health.controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { loadReleaseMetadata } from "./release-metadata.ts";

const controllers: Type<unknown>[] = [
  MiniappController,
  AdminController,
  HealthController,
];
if (process.env.MINIAPP_ACCEPTANCE_MODE === "1")
  controllers.push(AcceptanceController);

@Module({
  controllers,
  providers: [
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
