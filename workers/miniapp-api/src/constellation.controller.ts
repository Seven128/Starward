import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ConstellationPublicationService } from "./constellation-publication.ts";

@Controller("v2/sky/constellations")
export class ConstellationController {
  constructor(@Inject(ConstellationPublicationService) private readonly publication: ConstellationPublicationService) {}
  @Get()
  get() { return this.publication.get(); }

  @Get(":catalogHash/assets/:file")
  async asset(@Param("catalogHash") catalogHash: string, @Param("file") file: string, @Res() reply: FastifyReply) {
    const result = await this.publication.asset(catalogHash,file);
    return reply.header("content-type",result.contentType).header("cache-control","public, max-age=31536000, immutable")
      .header("x-content-type-options","nosniff").send(result.bytes);
  }
}
