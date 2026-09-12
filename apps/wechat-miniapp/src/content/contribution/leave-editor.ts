import { confirmEditorLeave } from "@/hooks/editor-leave";

export async function confirmContributionEditorLeave(input: {
  busy: boolean;
  dirty: boolean;
  confirm: () => Promise<boolean>;
}) {
  return confirmEditorLeave(input);
}
