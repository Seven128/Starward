export interface EditorLeaveGuardInput {
  busy: boolean;
  dirty: boolean;
  confirm: () => Promise<boolean>;
}

/** A busy editor or failed confirmation never becomes authorization to leave. */
export async function confirmEditorLeave(input: EditorLeaveGuardInput) {
  if (input.busy) return false;
  if (!input.dirty) return true;
  try {
    return await input.confirm();
  } catch {
    return false;
  }
}
