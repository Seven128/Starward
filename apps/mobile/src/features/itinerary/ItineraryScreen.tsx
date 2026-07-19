import { ScenarioScreen } from "../shared/ScenarioScreen"; import { itineraryFeature } from "./index";
export function ItineraryScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={itineraryFeature} fixture={fixture} />; }
