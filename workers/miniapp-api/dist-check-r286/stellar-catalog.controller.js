var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Inject, Param } from "@nestjs/common";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.js";
/** Static astronomy publication has no account, place or observation-time state. */
let StellarCatalogController = class StellarCatalogController {
    catalogs;
    constructor(catalogs) {
        this.catalogs = catalogs;
    }
    get(catalogVersion, catalogHash) {
        return this.catalogs.get({ catalogVersion, catalogHash });
    }
};
__decorate([
    Get(":catalogVersion/:catalogHash"),
    __param(0, Param("catalogVersion")),
    __param(1, Param("catalogHash")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StellarCatalogController.prototype, "get", null);
StellarCatalogController = __decorate([
    Controller("v2/sky/catalogs"),
    __param(0, Inject(StellarCatalogPublicationService)),
    __metadata("design:paramtypes", [StellarCatalogPublicationService])
], StellarCatalogController);
export { StellarCatalogController };
//# sourceMappingURL=stellar-catalog.controller.js.map