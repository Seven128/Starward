import { ScenarioScreen } from "../shared/ScenarioScreen"; import { shootingFeature } from "./index";
export function ShootingScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={shootingFeature} fixture={fixture} />; }
