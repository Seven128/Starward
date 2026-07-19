import { ScenarioScreen } from "../shared/ScenarioScreen"; import { fieldFeature } from "./index";
export function FieldScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={fieldFeature} fixture={fixture} />; }
