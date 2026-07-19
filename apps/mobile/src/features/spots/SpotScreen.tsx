import { ScenarioScreen } from "../shared/ScenarioScreen"; import { spotFeature } from "./index";
export function SpotScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={spotFeature} fixture={fixture} />; }
