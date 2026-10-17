import { randomUUID } from "node:crypto";
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/u;
export function requestIdFromHeaders(headers) {
    const candidate = headers?.["x-request-id"];
    return typeof candidate === "string" && REQUEST_ID_PATTERN.test(candidate)
        ? candidate
        : randomUUID();
}
//# sourceMappingURL=request-id.js.map