import { confirmEditorLeave } from "@/hooks/editor-leave";

export async function confirmContributionEditorLeave(input: {
  busy: boolean;
  dirty: boolean;
  confirm: () => Promise<boolean>;
  discard: () => boolean;
}) {
  if (!(await confirmEditorLeave(input))) return false;
  return !input.dirty || input.discard();
}
