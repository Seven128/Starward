import { confirmEditorLeave } from "@/hooks/editor-leave";

/** A failed confirmation never becomes authorization to leave. */
export async function confirmPlanEditorLeave(input: {
  busy: boolean;
  dirty: boolean;
  confirm(): Promise<boolean>;
}) {
  return confirmEditorLeave(input);
}
