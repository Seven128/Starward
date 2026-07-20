import { applyItineraryPatch, projectSharedItinerary, type Itinerary, type ItineraryRole } from "../../../../../packages/domain/src/itinerary/index";
export interface ItineraryRepository { get(id: string): Promise<Itinerary | null>; save(value: Itinerary): Promise<void> }
export class ItineraryService {
  constructor(private readonly repository: ItineraryRepository) {}
  async patch(id: string, input: { idempotencyKey: string; actorId: string; role: ItineraryRole; baseRevision: number; patch: Parameters<typeof applyItineraryPatch>[1]["patch"]; at: string }) { const current = await this.repository.get(id); if (!current) return { status: "not-found" as const }; const result = applyItineraryPatch(current, input); if (result.status === "applied") await this.repository.save(result.value); return result; }
  async share(id: string, viewer: "anonymous" | "invitee" | "member" | "owner") { const current = await this.repository.get(id); return current ? projectSharedItinerary(current, viewer) : null; }
}
