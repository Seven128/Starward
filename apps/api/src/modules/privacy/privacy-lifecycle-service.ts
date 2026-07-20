import { buildExportProjection, createDeletionRequest } from "@starward/domain/identity";
export interface PrivacyRepository { saveExport(value: ReturnType<typeof buildExportProjection>): Promise<void>; saveDeletion(value: ReturnType<typeof createDeletionRequest>): Promise<void>; revokeAllSessions(userId: string, at: string): Promise<void> }
export class PrivacyLifecycleService {
  constructor(private readonly repository: PrivacyRepository, private readonly now: () => string = () => new Date().toISOString()) {}
  async requestExport(userId: string, payload: Record<string, unknown>, reauthenticated: boolean) { if (!reauthenticated) throw new Error("reauthentication_required"); const value = buildExportProjection({ userId, payload, generatedAt: this.now() }); await this.repository.saveExport(value); return value; }
  async requestDeletion(input: { id: string; userId: string; reauthenticated: boolean; contributionChoice: "delete-personal" | "anonymize-facts" }) { const now = this.now(); const value = createDeletionRequest({ id: input.id, userId: input.userId, requestedAt: now, reauthenticated: input.reauthenticated, publicContributionChoice: input.contributionChoice }); await this.repository.revokeAllSessions(input.userId, now); await this.repository.saveDeletion(value); return value; }
}
