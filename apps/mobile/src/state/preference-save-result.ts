/** A rejected write followed by authoritative current-profile readback. */
export class PreferenceProfileRevisionConflict extends Error {
  constructor(readonly profileId: string, readonly currentRevision: number) {
    super("preference_runtime_profile_revision_conflict");
  }
}
