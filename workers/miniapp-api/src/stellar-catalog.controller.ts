import { Controller, Get, Inject, Param } from "@nestjs/common";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";

/** Static astronomy publication has no account, place or observation-time state. */
@Controller("v2/sky/catalogs")
export class StellarCatalogController {
  constructor(@Inject(StellarCatalogPublicationService) private readonly catalogs: StellarCatalogPublicationService) {}

  @Get(":catalogVersion/:catalogHash")
  get(@Param("catalogVersion") catalogVersion: string, @Param("catalogHash") catalogHash: string) {
    return this.catalogs.get({ catalogVersion, catalogHash });
  }
}
