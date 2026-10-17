import { createHash } from "node:crypto";
import { validateExternalUrl } from "@starward/miniapp-contracts";
function text(value, max) {
    return typeof value === "string" && Boolean(value.trim()) && value.length <= max && !value.includes("\uFFFD");
}
export function validateEventArticleLicense(value) {
    if (typeof value !== "string" || !value.trim() || value.length > 300)
        throw new Error("event_article_license_invalid");
}
export function validateEventArticle(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("event_article_invalid");
    const a = value;
    const allowed = ["title", "paragraphs", "sourceId", "originalUrl", "authorName", "publishedTime", "retrievedAt", "inputSha256", "parserVersion"];
    if (Object.keys(a).some(key => !allowed.includes(key)) || !text(a.title, 300) || !text(a.sourceId, 128)
        || !text(a.parserVersion, 100) || !Array.isArray(a.paragraphs) || !a.paragraphs.length || a.paragraphs.length > 500
        || a.paragraphs.some(p => !text(p, 40_000)) || a.paragraphs.join("\n").length > 40_000
        || (a.authorName !== null && !text(a.authorName, 300)) || (a.publishedTime !== null && !text(a.publishedTime, 100))
        || typeof a.retrievedAt !== "string" || !Number.isFinite(Date.parse(a.retrievedAt))
        || (a.inputSha256 !== null && (typeof a.inputSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(a.inputSha256))))
        throw new Error("event_article_invalid");
    const url = typeof a.originalUrl === "string" ? validateExternalUrl(a.originalUrl) : null;
    if (!url?.ok || !url.normalizedUrl?.startsWith("https://") || a.originalUrl.length > 2000)
        throw new Error("event_article_url_invalid");
}
export function eventArticleIdentity(article, source) {
    // Fixed-order projection avoids depending on JSON property order from uploads.
    const canonical = (value) => Array.isArray(value) ? value.map(canonical)
        : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
    return createHash("sha256").update(JSON.stringify(canonical({ article, source }))).digest("hex");
}
export function validateArticleRights(rights, expectedHash) {
    if (!rights || Object.keys(rights).some(key => !["articleSha256", "basis", "registeredSourceId", "confirmedBy", "confirmedAt"].includes(key))
        || rights.articleSha256 !== expectedHash || !text(rights.basis, 2000) || !text(rights.confirmedBy, 200)
        || !text(rights.registeredSourceId, 128)
        || typeof rights.confirmedAt !== "string" || !Number.isFinite(Date.parse(rights.confirmedAt)))
        throw new Error("event_article_rights_required");
}
export function confirmArticleRights(confirmation, actorId, articleSha256) {
    if (confirmation?.confirmed !== true || !text(confirmation.basis, 2000) || !text(confirmation.registeredSourceId, 128) || !text(actorId, 200))
        throw new Error("event_article_rights_required");
    return { articleSha256, basis: confirmation.basis.trim(), registeredSourceId: confirmation.registeredSourceId, confirmedBy: actorId, confirmedAt: new Date().toISOString() };
}
//# sourceMappingURL=event-article-policy.js.map