import { randomUUID } from "node:crypto";
import {
  DEFAULT_USER_PREFERENCES,
  type ImportDraft,
  type ObservationPlan,
  type PlanId,
  type ProfileLink,
  type SpotId,
  type UserId,
  type UserPreferences,
  type UserPreferencesRecord,
} from "@starward/miniapp-contracts";

export class InMemoryLibraryStore {
  #favorites = new Map<UserId, Set<SpotId>>();
  #plans = new Map<UserId, Map<string, ObservationPlan>>();
  #links = new Map<UserId, Map<string, ProfileLink>>();
  #imports = new Map<UserId, Map<string, ImportDraft>>();
  #preferences = new Map<UserId, UserPreferencesRecord>();
  #idempotency = new Map<string, unknown>();

  reset() {
    this.#favorites.clear();
    this.#plans.clear();
    this.#links.clear();
    this.#imports.clear();
    this.#preferences.clear();
    this.#idempotency.clear();
  }

  ensureUser(userId: UserId) {
    if (this.#favorites.has(userId)) return;
    this.#favorites.set(userId, new Set());
    this.#plans.set(userId, new Map());
    this.#links.set(userId, new Map());
    this.#imports.set(userId, new Map());
    this.#preferences.set(userId, {
      preferences: structuredClone(DEFAULT_USER_PREFERENCES),
      revision: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  getPreferences(userId: UserId) {
    this.ensureUser(userId);
    return structuredClone(this.#preferences.get(userId)!);
  }

  savePreferences(
    userId: UserId,
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<UserPreferencesRecord>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const current = this.#preferences.get(userId)!;
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

  listFavoriteIds(userId: UserId) {
    this.ensureUser(userId);
    return [...this.#favorites.get(userId)!];
  }

  setFavorite(
    userId: UserId,
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    if (this.#replay(userId, idempotencyKey)) return;
    const favorites = this.#favorites.get(userId)!;
    favorite ? favorites.add(spotId) : favorites.delete(spotId);
    this.#remember(userId, idempotencyKey, { spotId, favorite });
  }

  listPlans(userId: UserId) {
    this.ensureUser(userId);
    return [...this.#plans.get(userId)!.values()].map((plan) =>
      structuredClone(plan),
    );
  }

  savePlan(
    userId: UserId,
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ObservationPlan>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const plans = this.#plans.get(userId)!;
    const existing = plans.get(plan.planId);
    if (expectedRevision !== null && (existing?.revision ?? 0) !== expectedRevision)
      throw new Error("plan_revision_conflict");
    const saved = {
      ...structuredClone(plan),
      planId: (plan.planId || `plan:${randomUUID()}`) as PlanId,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    plans.set(saved.planId, saved);
    this.#remember(userId, idempotencyKey, saved);
    return structuredClone(saved);
  }

  deletePlan(userId: UserId, planId: string, idempotencyKey: string) {
    this.ensureUser(userId);
    if (this.#replay(userId, idempotencyKey)) return;
    this.#plans.get(userId)!.delete(planId);
    this.#remember(userId, idempotencyKey, true);
  }

  listProfileLinks(userId: UserId) {
    this.ensureUser(userId);
    return [...this.#links.get(userId)!.values()]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((link) => structuredClone(link));
  }

  saveProfileLink(
    userId: UserId,
    link: ProfileLink,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ProfileLink>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    this.#links.get(userId)!.set(link.profileLinkId, structuredClone(link));
    this.#remember(userId, idempotencyKey, link);
    return structuredClone(link);
  }

  deleteProfileLink(userId: UserId, id: string, idempotencyKey: string) {
    this.ensureUser(userId);
    if (this.#replay(userId, idempotencyKey)) return;
    this.#links.get(userId)!.delete(id);
    this.#remember(userId, idempotencyKey, true);
  }

  saveImportDraft(
    userId: UserId,
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ) {
    this.ensureUser(userId);
    const replay = this.#replay<ImportDraft>(userId, idempotencyKey);
    if (replay) return structuredClone(replay);
    const imports = this.#imports.get(userId)!;
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

  listImportDrafts(userId: UserId) {
    this.ensureUser(userId);
    return [...this.#imports.get(userId)!.values()]
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .map((draft) => structuredClone(draft));
  }

  getImportDraft(userId: UserId, id: string) {
    this.ensureUser(userId);
    const draft = this.#imports.get(userId)!.get(id);
    return draft ? structuredClone(draft) : null;
  }

  #key(userId: UserId, idempotencyKey: string) {
    return `${userId}|${idempotencyKey}`;
  }
  #replay<T>(userId: UserId, idempotencyKey: string): T | undefined {
    return this.#idempotency.get(this.#key(userId, idempotencyKey)) as
      | T
      | undefined;
  }
  #remember(userId: UserId, idempotencyKey: string, value: unknown) {
    this.#idempotency.set(
      this.#key(userId, idempotencyKey),
      structuredClone(value),
    );
  }
}
