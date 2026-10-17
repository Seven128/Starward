import { randomUUID } from "node:crypto";
import { DEFAULT_USER_PREFERENCES, } from "@starward/miniapp-contracts";
export class InMemoryLibraryStore {
    #favorites = new Map();
    #plans = new Map();
    #links = new Map();
    #imports = new Map();
    #profiles = new Map();
    #preferences = new Map();
    #idempotency = new Map();
    reset() {
        this.#favorites.clear();
        this.#plans.clear();
        this.#links.clear();
        this.#imports.clear();
        this.#preferences.clear();
        this.#profiles.clear();
        this.#idempotency.clear();
    }
    deleteUser(userId) {
        this.#favorites.delete(userId);
        this.#plans.delete(userId);
        this.#links.delete(userId);
        this.#imports.delete(userId);
        this.#preferences.delete(userId);
        this.#profiles.delete(userId);
        for (const key of this.#idempotency.keys())
            if (key.startsWith(`${userId}|`))
                this.#idempotency.delete(key);
    }
    ensureUser(userId) {
        if (this.#favorites.has(userId))
            return;
        this.#favorites.set(userId, new Set());
        this.#profiles.set(userId, { nickname: null, avatar: null, revision: 1, updatedAt: new Date().toISOString() });
        this.#plans.set(userId, new Map());
        this.#links.set(userId, new Map());
        this.#imports.set(userId, new Map());
        this.#preferences.set(userId, {
            preferences: structuredClone(DEFAULT_USER_PREFERENCES),
            revision: 1,
            updatedAt: new Date().toISOString(),
        });
    }
    getAccountProfile(userId) {
        this.ensureUser(userId);
        return structuredClone(this.#profiles.get(userId));
    }
    saveAccountNickname(userId, nickname, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay) {
            if (replay.nickname !== nickname || replay.revision !== expectedRevision + 1)
                throw new Error("account_profile_idempotency_conflict");
            return structuredClone(replay);
        }
        const current = this.#profiles.get(userId);
        if (current.revision !== expectedRevision)
            throw new Error("account_profile_revision_conflict");
        const saved = { nickname, avatar: current.avatar, revision: current.revision + 1, updatedAt: new Date().toISOString() };
        this.#profiles.set(userId, saved);
        this.#remember(userId, idempotencyKey, saved);
        return structuredClone(saved);
    }
    saveAccountAvatar(userId, avatar, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay) {
            if (replay.profile.avatar?.version !== avatar.version || replay.profile.revision !== expectedRevision + 1)
                throw new Error("account_profile_idempotency_conflict");
            return structuredClone(replay);
        }
        const current = this.#profiles.get(userId);
        if (current.revision !== expectedRevision)
            throw new Error("account_profile_revision_conflict");
        const profile = { ...current, avatar: structuredClone(avatar), revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
        const result = { profile, previousObjectKey: current.avatar ? `memory:${current.avatar.version}` : null };
        this.#profiles.set(userId, profile);
        this.#remember(userId, idempotencyKey, result);
        return structuredClone(result);
    }
    getPreferences(userId) {
        this.ensureUser(userId);
        return structuredClone(this.#preferences.get(userId));
    }
    savePreferences(userId, preferences, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const current = this.#preferences.get(userId);
        if (current.revision !== expectedRevision)
            throw new Error("preferences_revision_conflict");
        const saved = {
            preferences: structuredClone(preferences),
            revision: expectedRevision + 1,
            updatedAt: new Date().toISOString(),
        };
        this.#preferences.set(userId, saved);
        this.#remember(userId, idempotencyKey, saved);
        return structuredClone(saved);
    }
    listFavoriteIds(userId) {
        this.ensureUser(userId);
        return [...this.#favorites.get(userId)];
    }
    setFavorite(userId, spotId, favorite, idempotencyKey) {
        this.ensureUser(userId);
        if (this.#replay(userId, idempotencyKey))
            return;
        const favorites = this.#favorites.get(userId);
        favorite ? favorites.add(spotId) : favorites.delete(spotId);
        this.#remember(userId, idempotencyKey, { spotId, favorite });
    }
    listPlans(userId) {
        this.ensureUser(userId);
        return [...this.#plans.get(userId).values()].map((plan) => structuredClone(plan));
    }
    getPlanSaveReceipt(userId, planId, idempotencyKey) {
        const receipt = this.#replay(userId, idempotencyKey);
        return receipt?.planId === planId ? structuredClone(receipt) : null;
    }
    savePlan(userId, plan, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const plans = this.#plans.get(userId);
        const existing = plans.get(plan.planId);
        if (expectedRevision === null && existing)
            throw new Error("plan_revision_conflict");
        if (expectedRevision !== null && (existing?.revision ?? 0) !== expectedRevision)
            throw new Error("plan_revision_conflict");
        const saved = {
            ...structuredClone(plan),
            planId: (plan.planId || `plan:${randomUUID()}`),
            revision: (existing?.revision ?? 0) + 1,
            updatedAt: new Date().toISOString(),
        };
        plans.set(saved.planId, saved);
        this.#remember(userId, idempotencyKey, saved);
        return structuredClone(saved);
    }
    deletePlan(userId, planId, idempotencyKey) {
        this.ensureUser(userId);
        if (this.#replay(userId, idempotencyKey))
            return;
        this.#plans.get(userId).delete(planId);
        this.#remember(userId, idempotencyKey, true);
    }
    listProfileLinks(userId) {
        this.ensureUser(userId);
        return [...this.#links.get(userId).values()]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((link) => structuredClone(link));
    }
    saveProfileLink(userId, link, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        if ([...this.#links.get(userId).values()].some(existing => existing.url === link.url && existing.profileLinkId !== link.profileLinkId))
            throw new Error("profile_link_duplicate");
        this.#links.get(userId).set(link.profileLinkId, structuredClone(link));
        this.#remember(userId, idempotencyKey, link);
        return structuredClone(link);
    }
    deleteProfileLink(userId, id, idempotencyKey) {
        this.ensureUser(userId);
        if (this.#replay(userId, idempotencyKey))
            return;
        this.#links.get(userId).delete(id);
        this.#remember(userId, idempotencyKey, true);
    }
    saveImportDraft(userId, draft, expectedRevision, idempotencyKey) {
        this.ensureUser(userId);
        const replay = this.#replay(userId, idempotencyKey);
        if (replay)
            return structuredClone(replay);
        const imports = this.#imports.get(userId);
        const existing = imports.get(draft.importDraftId);
        if (expectedRevision !== null && (existing?.revision ?? 0) !== expectedRevision)
            throw new Error("import_revision_conflict");
        const saved = {
            ...structuredClone(draft),
            revision: (existing?.revision ?? 0) + 1,
        };
        imports.set(saved.importDraftId, saved);
        this.#remember(userId, idempotencyKey, saved);
        return structuredClone(saved);
    }
    getImportSaveReceipt(userId, id, idempotencyKey) {
        const receipt = this.#replay(userId, idempotencyKey);
        return receipt?.importDraftId === id ? structuredClone(receipt) : null;
    }
    listImportDrafts(userId) {
        this.ensureUser(userId);
        return [...this.#imports.get(userId).values()]
            .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
            .map((draft) => structuredClone(draft));
    }
    getImportDraft(userId, id) {
        this.ensureUser(userId);
        const draft = this.#imports.get(userId).get(id);
        return draft ? structuredClone(draft) : null;
    }
    #key(userId, idempotencyKey) {
        return `${userId}|${idempotencyKey}`;
    }
    #replay(userId, idempotencyKey) {
        return this.#idempotency.get(this.#key(userId, idempotencyKey));
    }
    #remember(userId, idempotencyKey, value) {
        this.#idempotency.set(this.#key(userId, idempotencyKey), structuredClone(value));
    }
}
//# sourceMappingURL=in-memory-library-store.js.map