import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { MiniappService } from "./miniapp-service.ts";
import type { ReleaseMetadata } from "./release-metadata.ts";

export const RELEASE_METADATA = Symbol("STARWARD_RELEASE_METADATA");

@Controller("health")
export class HealthController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
    @Inject(RELEASE_METADATA) private readonly release: ReleaseMetadata,
  ) {}

  @Get("live")
  live() {
    return { status: "alive", release: this.release };
  }

  @Get("ready")
  async ready(@Res({ passthrough: true }) reply: FastifyReply) {
    const snapshot = await this.service.readinessSnapshot();
    if (!snapshot.ready) reply.code(503);
    return {
      status: snapshot.ready ? "ready" : "not-ready",
      release: this.release,
      ...snapshot,
    };
  }

  @Get("release")
  releaseIdentity() {
    return this.release;
  }
}
