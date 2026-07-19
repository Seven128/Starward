import { ScenarioScreen } from "../shared/ScenarioScreen"; import { communityFeature } from "./index";
export function CommunityScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={communityFeature} fixture={fixture} />; }
