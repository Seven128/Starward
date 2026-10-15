import { SystemMotionProbe } from "@/components/system-motion-probe";
import PlanEditorPage from "../detail/plan-editor-page";
import { AccountEntry } from "../../account-entry";

/** Route owns its own draft/context state while reusing the existing plan form owner. */
export default function DedicatedPlanEditorPage() {
  return <AccountEntry title="观星计划"><SystemMotionProbe /><PlanEditorPage dedicatedEditor /></AccountEntry>;
}

