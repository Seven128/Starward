import { randomUUID } from "node:crypto";
import { assertAdminOperation, assertAdminToken, normalizeAdminActor, } from "./admin-auth.js";
import { PostgresMiniappRepository } from "./postgres-repository.js";
export function requiredText(value, field, maximum) {
    if (typeof value !== "string" || !value.trim() || value.length > maximum)
        throw new Error(`admin_${field}_invalid`);
    return value.trim();
}
export function requiredRevision(value, field) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
        throw new Error(`admin_${field}_invalid`);
    return value;
}
export function requiredIdempotency(value) {
    return requiredText(value, "idempotency_key", 200);
}
export function requiredSpotId(value) {
    const spotId = decodeURIComponent(value);
    if (!/^spot:[a-zA-Z0-9._:-]+$/u.test(spotId))
        throw new Error("formal_spot_not_found");
    return spotId;
}
export function requiredUploadId(value) {
    const uploadId = decodeURIComponent(value);
    if (!/^upload:[a-zA-Z0-9._:-]+$/u.test(uploadId))
        throw new Error("contribution_upload_not_found");
    return uploadId;
}
function requiredClaims(value) {
    if (!Array.isArray(value) ||
        value.length === 0 ||
        value.length > 8 ||
        value.some((claim) => typeof claim !== "string" || !claim.trim()) ||
        new Set(value).size !== value.length)
        throw new Error("contribution_merge_claims_invalid");
    return value.map((claim) => claim.trim());
}
export function optionalClaims(value) {
    return value === undefined ? [] : requiredClaims(value);
}
export function adminOperationsContext(service, token, actor, operation) {
    assertAdminToken(token);
    if (!(service.repository instanceof PostgresMiniappRepository))
        throw new Error("admin_requires_postgres");
    const actorId = normalizeAdminActor(actor);
    assertAdminOperation(actorId, operation);
    return {
        repository: service.repository,
        actorId,
        requestId: randomUUID(),
    };
}
//# sourceMappingURL=admin-operations-support.js.map