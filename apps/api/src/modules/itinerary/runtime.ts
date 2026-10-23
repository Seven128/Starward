import { join } from "node:path";
import { SqliteItineraryRepository } from "./sqlite-itinerary-repository";
import { ItineraryService } from "./itinerary-service";

export interface ItineraryRuntimeOptions {
  dataDir: string;
  releaseProfile?: { id: string; productionTrafficAllowed: boolean; externalServicesBudgetCny: number };
}
export async function createItineraryRuntime(options: ItineraryRuntimeOptions) {
  if (!options.dataDir.trim()) throw new Error("itinerary_data_dir_required");
  if (options.releaseProfile && (options.releaseProfile.id !== "individual-personal-trial" || options.releaseProfile.productionTrafficAllowed !== false || options.releaseProfile.externalServicesBudgetCny > 200)) throw new Error("itinerary_release_profile_invalid");
  const repository = new SqliteItineraryRepository(join(options.dataDir, "itinerary-and-collaboration.sqlite"));
  return { service: new ItineraryService(repository), close: async () => repository.close() };
}
