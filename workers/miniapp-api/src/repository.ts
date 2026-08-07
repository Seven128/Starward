import { randomUUID } from "node:crypto";
import {
  DEMO_SPOTS,
  DEFAULT_USER_PREFERENCES,
  buildDemoSpotDetail,
  type ImportDraft,
  type ObservationPlan,
  type PlanId,
  type ProfileLink,
  type SpotId,
  type UserPreferences,
  type UserPreferencesRecord,
} from "@starward/miniapp-contracts";
import { distanceMeters } from "@starward/coordinate-system";
import type { MiniappRepositoryPort } from "./ports.ts";

export class InMemoryDemoRepository implements MiniappRepositoryPort {
  readonly kind = "memory" as const;
  #favorites = new Set<SpotId>();
  #plans = new Map<string, ObservationPlan>();
  #links = new Map<string, ProfileLink>();
  #imports = new Map<string, ImportDraft>();
  #idempotency = new Map<string, unknown>();
  #preferences: UserPreferencesRecord = {
    preferences: { ...DEFAULT_USER_PREFERENCES },
    revision: 1,
    updatedAt: new Date().toISOString(),
  };

  resetForAcceptance() {
    this.#favorites.clear();
    this.#plans.clear();
    this.#links.clear();
    this.#imports.clear();
    this.#idempotency.clear();
    this.#preferences = {
      preferences: { ...DEFAULT_USER_PREFERENCES },
      revision: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  async listSpots() {
    return DEMO_SPOTS;
  }
  async listSpotsInRadius(
    center: { system: "WGS84"; latitude: number; longitude: number },
    radiusKm: number,
  ) {
    return DEMO_SPOTS.filter(
      (spot) =>
        distanceMeters(
          { lat: center.latitude, lon: center.longitude },
          { lat: spot.wgs84.latitude, lon: spot.wgs84.longitude },
        ) <=
        radiusKm * 1_000,
    );
  }
  async getSpot(spotId: SpotId) {
    return DEMO_SPOTS.find((spot) => spot.spotId === spotId) ?? null;
  }
  async getDetail(spotId: SpotId) {
    return buildDemoSpotDetail(spotId);
  }
  async getPreferences() {
    return structuredClone(this.#preferences);
  }
  async savePreferences(
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    const replay = this.#idempotency.get(idempotencyKey) as
      | UserPreferencesRecord
      | undefined;
    if (replay) return structuredClone(replay);
    if (this.#preferences.revision !== expectedRevision)
      throw new Error("preferences_revision_conflict");
    this.#preferences = {
      preferences: structuredClone(preferences),
      revision: expectedRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    this.#idempotency.set(idempotencyKey, this.#preferences);
    return structuredClone(this.#preferences);
  }
  async listFavoriteIds() {
    return [...this.#favorites];
  }

  async setFavorite(
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ): Promise<void> {
    if (this.#idempotency.has(idempotencyKey)) return;
    if (!(await this.getSpot(spotId))) throw new Error("formal_spot_not_found");
    favorite ? this.#favorites.add(spotId) : this.#favorites.delete(spotId);
    this.#idempotency.set(idempotencyKey, { spotId, favorite });
  }

  async listPlans() {
    return [...this.#plans.values()].map((plan) => ({ ...plan }));
  }
  async savePlan(
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ObservationPlan> {
    const priorResult = this.#idempotency.get(idempotencyKey) as
      | ObservationPlan
      | undefined;
    if (priorResult) return priorResult;
    if (!(await this.getSpot(plan.spotId)))
      throw new Error("formal_spot_not_found");
    const existing = this.#plans.get(plan.planId);
    if (
      expectedRevision !== null &&
      (existing?.revision ?? 0) !== expectedRevision
    )
      throw new Error("plan_revision_conflict");
    const saved = {
      ...plan,
      planId: (plan.planId || `plan:${randomUUID()}`) as PlanId,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.#plans.set(saved.planId, saved);
    this.#idempotency.set(idempotencyKey, saved);
    return { ...saved };
  }
  async deletePlan(planId: string, idempotencyKey: string): Promise<void> {
    if (this.#idempotency.has(idempotencyKey)) return;
    this.#plans.delete(planId);
    this.#idempotency.set(idempotencyKey, true);
  }

  async listProfileLinks() {
    return [...this.#links.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => ({ ...link }));
  }
  async saveProfileLink(
    link: ProfileLink,
    idempotencyKey: string,
  ): Promise<ProfileLink> {
    const priorResult = this.#idempotency.get(idempotencyKey) as
      | ProfileLink
      | undefined;
    if (priorResult) return priorResult;
    this.#links.set(link.profileLinkId, { ...link });
    this.#idempotency.set(idempotencyKey, link);
    return { ...link };
  }
  async deleteProfileLink(id: string, idempotencyKey: string) {
    if (this.#idempotency.has(idempotencyKey)) return;
    this.#links.delete(id);
    this.#idempotency.set(idempotencyKey, true);
  }

  async saveImportDraft(
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ImportDraft> {
    const priorResult = this.#idempotency.get(idempotencyKey) as
      | ImportDraft
      | undefined;
    if (priorResult) return priorResult;
    const existing = this.#imports.get(draft.importDraftId);
    if (
      expectedRevision !== null &&
      (existing?.revision ?? 0) !== expectedRevision
    )
      throw new Error("import_revision_conflict");
    const saved = { ...draft, revision: (existing?.revision ?? 0) + 1 };
    this.#imports.set(saved.importDraftId, saved);
    this.#idempotency.set(idempotencyKey, saved);
    return structuredClone(saved);
  }
  async listImportDrafts() {
    return [...this.#imports.values()]
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .map((draft) => structuredClone(draft));
  }
  async getImportDraft(id: string) {
    const draft = this.#imports.get(id);
    return draft ? structuredClone(draft) : null;
  }

  async operationsSnapshot() {
    return {
      repository: this.kind,
      favorites: this.#favorites.size,
      plans: this.#plans.size,
      profileLinks: this.#links.size,
      imports: this.#imports.size,
      persistence: "development_or_unit_test_only",
    };
  }

  async close() {}
}
