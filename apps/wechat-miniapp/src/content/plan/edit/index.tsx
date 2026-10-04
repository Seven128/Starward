import { SystemMotionProbe } from "@/components/system-motion-probe";
import PlanEditorPage from "../detail/plan-editor-page";

/** Route owns its own draft/context state while reusing the existing plan form owner. */
export default function DedicatedPlanEditorPage() {
  return <><SystemMotionProbe /><PlanEditorPage dedicatedEditor /></>;
}

