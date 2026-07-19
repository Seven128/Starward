import { ScenarioScreen } from "../shared/ScenarioScreen"; import { tonightFeature } from "./index";
export function TonightScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={tonightFeature} fixture={fixture} />; }
