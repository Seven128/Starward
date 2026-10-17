import { randomUUID } from "node:crypto";
/** In-process outbox used only by the explicit memory test repository. */
export class MemoryOutbox {
    #records = new Map();
    enqueue(kind, idempotencyKey, payload) {
        const existing = [...this.#records.values()].find((record) => record.idempotencyKey === idempotencyKey);
        if (existing)
            return existing;
        const record = {
            id: randomUUID(),
            kind,
            idempotencyKey,
            payload,
            attempts: 0,
            state: "PENDING",
            createdAt: new Date().toISOString(),
            completedAt: null,
        };
        this.#records.set(record.id, record);
        return record;
    }
    async consume(id, handler) {
        const record = this.#records.get(id);
        if (!record)
            throw new Error("outbox_record_not_found");
        if (record.state === "COMPLETE")
            return record;
        record.attempts += 1;
        try {
            await handler(record);
            record.state = "COMPLETE";
            record.completedAt = new Date().toISOString();
        }
        catch (error) {
            if (record.attempts >= 3)
                record.state = "DEAD_LETTER";
            throw error;
        }
        return record;
    }
    snapshot() {
        return [...this.#records.values()].map((record) => ({ ...record }));
    }
    resetForAcceptance() {
        this.#records.clear();
    }
}
export class MemoryTelemetry {
    #events = [];
    event(name, fields) {
        this.#events.push(this.#sanitize({
            type: "event",
            name,
            at: new Date().toISOString(),
            ...fields,
        }));
    }
    error(error, fields) {
        this.#events.push(this.#sanitize({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
            at: new Date().toISOString(),
            ...fields,
        }));
    }
    snapshot() {
        return [...this.#events];
    }
    resetForAcceptance() {
        this.#events = [];
    }
    #sanitize(fields) {
        const redacted = { ...fields };
        for (const key of Object.keys(redacted)) {
            if (/secret|token|cookie|password|latitude|longitude|exactLocation/iu.test(key))
                redacted[key] = "[REDACTED]";
        }
        return Object.freeze(redacted);
    }
}
export function unavailableSource(id, title) {
    const now = new Date().toISOString();
    return {
        id,
        kind: "PRODUCT_CALCULATION",
        provider: "今晚去观星能力状态",
        title,
        sourceUrl: "",
        license: "产品运行状态",
        licenseUrl: "",
        publishedAt: null,
        retrievedAt: now,
        validFrom: null,
        validTo: null,
        state: "UNAVAILABLE",
        confidence: null,
        precision: "仅说明能力不可用，不包含供应商事实",
        limitations: [
            "能力未启用或未配置具备许可的供应商；只允许显示明确的手动或稳定回退",
        ],
    };
}
//# sourceMappingURL=runtime.js.map