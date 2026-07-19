import { ScenarioScreen } from "../shared/ScenarioScreen"; import { adminOperationsFeature } from "../../../../admin-web/src/app/page";
export function AdminOperationsScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={adminOperationsFeature} fixture={fixture} />; }
