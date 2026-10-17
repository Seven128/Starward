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
import { Controller, Get, Headers, Inject, Param, Res } from '@nestjs/common';
import { SaoPublicationService } from "./sao-publication.js";
import { skyPublicAssetHeaders } from "./sky-public-asset-headers.js";
let SaoPublicationController = class SaoPublicationController {
    publication;
    revised = new SaoPublicationService(new URL('../assets/sao-v2/', import.meta.url));
    constructor(publication) {
        this.publication = publication;
    }
    get() { return this.publication.get(); }
    revisedGet() { return this.revised.get(); }
    tile(publicationHash, tileId) {
        return this.publication.tile(publicationHash, tileId);
    }
    revisedTile(publicationHash, tileId) {
        return this.revised.tile(publicationHash, tileId);
    }
    async revisedAsset(publicationHash, tileId, candidate, reply) {
        const asset = await this.revised.asset(publicationHash, tileId), etag = `W/"${asset.sha256}"`;
        reply.headers({ ...skyPublicAssetHeaders('sao', asset.contentType), etag });
        return candidate === etag ? reply.status(304).send() : reply.send(asset.bytes);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SaoPublicationController.prototype, "get", null);
__decorate([
    Get('v2'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SaoPublicationController.prototype, "revisedGet", null);
__decorate([
    Get(':publicationHash/tiles/:tileId'),
    __param(0, Param('publicationHash')),
    __param(1, Param('tileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SaoPublicationController.prototype, "tile", null);
__decorate([
    Get('v2/:publicationHash/tiles/:tileId'),
    __param(0, Param('publicationHash')),
    __param(1, Param('tileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SaoPublicationController.prototype, "revisedTile", null);
__decorate([
    Get('v2/:publicationHash/assets/:tileId'),
    __param(0, Param('publicationHash')),
    __param(1, Param('tileId')),
    __param(2, Headers('if-none-match')),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SaoPublicationController.prototype, "revisedAsset", null);
SaoPublicationController = __decorate([
    Controller('v2/sky/supplements/sao'),
    __param(0, Inject(SaoPublicationService)),
    __metadata("design:paramtypes", [SaoPublicationService])
], SaoPublicationController);
export { SaoPublicationController };
//# sourceMappingURL=sao-publication.controller.js.map