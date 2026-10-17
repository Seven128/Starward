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
import { Controller, Headers, Inject, NotFoundException, Post, } from "@nestjs/common";
import { MiniappService } from "./miniapp-service.js";
let AcceptanceController = class AcceptanceController {
    service;
    constructor(service) {
        this.service = service;
    }
    async reset(token = "") {
        const expected = process.env.MINIAPP_ACCEPTANCE_TOKEN ?? "";
        if (process.env.MINIAPP_ACCEPTANCE_MODE !== "1" ||
            expected.length < 20 ||
            token !== expected)
            throw new NotFoundException("acceptance_control_unavailable");
        await this.service.resetAcceptanceState();
        return { status: "reset", storage: "memory" };
    }
};
__decorate([
    Post("reset"),
    __param(0, Headers("x-acceptance-token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcceptanceController.prototype, "reset", null);
AcceptanceController = __decorate([
    Controller("__acceptance"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], AcceptanceController);
export { AcceptanceController };
//# sourceMappingURL=acceptance.controller.js.map