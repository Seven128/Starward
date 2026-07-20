import { saveShootingPlanVersion, type ShootingInput, type ShootingPlanVersion } from "@starward/domain/shooting";

export interface ShootingPlanRepository { latest(id: string): Promise<ShootingPlanVersion | null>; save(plan: ShootingPlanVersion, idempotencyKey: string): Promise<ShootingPlanVersion> }

export class ShootingPlanService {
  constructor(private readonly repository: ShootingPlanRepository, private readonly now: () => string = () => new Date().toISOString()) {}
  async createOrRecalculate(input: { planId?: string; shooting: ShootingInput; userOverrides?: Record<string, unknown>; idempotencyKey: string; offlinePackRevision?: number }) {
    if (!input.idempotencyKey) throw new TypeError("idempotency_key_required");
    const previous = input.planId ? await this.repository.latest(input.planId) : null;
    const next = saveShootingPlanVersion(previous, input.shooting, input.userOverrides ?? {}, this.now());
    if (input.offlinePackRevision !== undefined) next.offlinePackRevision = input.offlinePackRevision;
    return this.repository.save(next, input.idempotencyKey);
  }
}
