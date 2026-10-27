import { useEffect } from "react";
import { randomUUID } from "expo-crypto";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";
import { PreferenceWizard } from "./PreferenceWizard";
import { useProfileEditor } from "./use-profile-editor";

/** Allocate only when the user starts a new task; examples and another preset's
 * content/metadata are not defaults for a newly named profile. */
export function createNewPreferenceDraft(profiles: readonly PreferenceProfile[]): PreferenceProfile {
  const seed = randomUUID();
  const existing = new Set(profiles.map(profile => profile.id));
  let id = seed, suffix = 1;
  while (existing.has(id)) id = `${seed}-${suffix++}`;
  return { ...createUnrestrictedProfile(), id, name: "" };
}

export function NewPreferenceProfileWizard({ initial, visible, ready, onSave, onClose, onRetire, resolveProfile }: {
  initial: PreferenceProfile;
  visible: boolean;
  ready: boolean;
  onSave(profile: PreferenceProfile): Promise<void>;
  onClose(): void;
  onRetire(id: string): void;
  resolveProfile(id: string): PreferenceProfile | undefined;
}) {
  const editor = useProfileEditor({ initial, visible, ready, onSave, resolveProfile });
  const unresolved = editor.hasUnresolvedSave;
  const submitting = editor.formState.isSubmitting;

  // A dismissed dispatched save still owns its candidate. Keep that same task
  // for confirmation, or retire it once a late successful completion settles.
  useEffect(() => {
    if (!visible && !unresolved && !submitting) onRetire(initial.id);
  }, [visible, unresolved, submitting, initial.id, onRetire]);

  const close = () => {
    onClose();
    // Read the attempt owner now, rather than a render captured before submit
    // or before its confirmation finished. No second pending state is created.
    if (!editor.hasUnresolvedSave) onRetire(initial.id);
  };

  return <PreferenceWizard editor={editor} visible={visible} ready={ready} onClose={close} />;
}
