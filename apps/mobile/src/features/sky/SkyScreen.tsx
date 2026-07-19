import { ScenarioScreen } from "../shared/ScenarioScreen"; import { skyFeature } from "./index";
export function SkyScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={skyFeature} fixture={fixture} />; }
