var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from "@nestjs/common";
import { map } from "rxjs";
function hasEtag(value) {
    return (typeof value === "object" &&
        value !== null &&
        "etag" in value &&
        typeof value.etag === "string");
}
let EtagInterceptor = class EtagInterceptor {
    intercept(context, next) {
        const http = context.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        return next.handle().pipe(map((payload) => {
            if (request.method !== "GET" || !hasEtag(payload))
                return payload;
            // A source-specific storage restriction also forbids conditional reuse.
            if (/\bno-store\b/iu.test(String(response.getHeader("cache-control") ?? "")))
                return payload;
            response.header("ETag", payload.etag);
            response.header("Cache-Control", "private, max-age=0, must-revalidate");
            response.header("Vary", "If-None-Match");
            const candidate = request.headers?.["if-none-match"];
            const supplied = Array.isArray(candidate) ? candidate[0] : candidate;
            if (supplied === payload.etag) {
                response.status(304);
                return undefined;
            }
            return payload;
        }));
    }
};
EtagInterceptor = __decorate([
    Injectable()
], EtagInterceptor);
export { EtagInterceptor };
//# sourceMappingURL=etag.interceptor.js.map