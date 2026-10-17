import { SystemMotionProbe } from "@/components/system-motion-probe";
import PlanEditorPage from "./plan-editor-page";
import { AccountEntry } from "../../account-entry";

export default function PlanDetailPage() {
  return <AccountEntry title="观星计划"><SystemMotionProbe /><PlanEditorPage /></AccountEntry>;
}
