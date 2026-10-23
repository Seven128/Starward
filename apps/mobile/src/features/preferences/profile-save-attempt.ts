import type { PreferenceProfile } from "@starward/domain/preferences";
import { PreferenceProfileRevisionConflict } from "../../state/preference-save-result";

/** One editable draft owns one complete save candidate across uncertain replies. */
export function createProfileSaveAttempt() {
  let current: { identity: string; profile: PreferenceProfile; pending?: Promise<void> } | undefined;
  return {
    hasUnresolvedSave: () => current !== undefined,
    async save(identity: string, createCandidate: () => PreferenceProfile, persist: (profile: PreferenceProfile) => Promise<void>) {
      if (!current || current.identity !== identity) current = { identity, profile: createCandidate() };
      const attempt = current;
      if (attempt.pending) { await attempt.pending; return attempt.profile; }
      const pending = Promise.resolve().then(() => persist(attempt.profile));
      attempt.pending = pending;
      try {
        await pending;
        if (current === attempt) current = undefined;
        return attempt.profile;
      } catch (error) {
        // A known rejected write with current revision readback can be reviewed
        // and submitted as a new intent on the next explicit save.
        if (error instanceof PreferenceProfileRevisionConflict && current === attempt) current = undefined;
        throw error;
      } finally {
        // Failure keeps the exact candidate, including both timestamps and its
        // object identity used by the runtime's prepared command owner.
        attempt.pending = undefined;
      }
    },
  };
}
