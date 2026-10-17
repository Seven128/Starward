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
import { Controller, Get, Inject, Res } from "@nestjs/common";
import { MiniappService } from "./miniapp-service.js";
export const RELEASE_METADATA = Symbol("STARWARD_RELEASE_METADATA");
let HealthController = class HealthController {
    service;
    release;
    constructor(service, release) {
        this.service = service;
        this.release = release;
    }
    live() {
        return { status: "alive", release: this.release };
    }
    async ready(reply) {
        const snapshot = await this.service.readinessSnapshot();
        if (!snapshot.ready)
            reply.code(503);
        return {
            status: snapshot.ready ? "ready" : "not-ready",
            release: this.release,
            ...snapshot,
        };
    }
    releaseIdentity() {
        return this.release;
    }
};
__decorate([
    Get("live"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    Get("ready"),
    __param(0, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
__decorate([
    Get("release"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "releaseIdentity", null);
HealthController = __decorate([
    Controller("health"),
    __param(0, Inject(MiniappService)),
    __param(1, Inject(RELEASE_METADATA)),
    __metadata("design:paramtypes", [MiniappService, Object])
], HealthController);
export { HealthController };
//# sourceMappingURL=health.controller.js.map