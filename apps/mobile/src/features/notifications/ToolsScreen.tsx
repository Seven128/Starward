import { ScenarioScreen } from "../shared/ScenarioScreen"; import { toolsFeature } from "./index";
export function ToolsScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={toolsFeature} fixture={fixture} />; }
