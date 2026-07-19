import { ScenarioScreen } from "../shared/ScenarioScreen"; import { mapFeature } from "./index";
export function MapScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={mapFeature} fixture={fixture} />; }
