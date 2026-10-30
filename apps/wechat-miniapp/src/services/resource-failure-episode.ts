/** A visible resource owner reports a continuous failure once. Query refresh,
 * temporary absence and hiding do not establish recovery. The caller supplies
 * positive current-scope health and owns the actual retry and notification. */
export function createResourceFailureEpisode() {
  let scope: string | undefined;
  let reported = false;
  return {
    observe(input: { scope: string; active: boolean; pending: boolean; failed: boolean; healthy: boolean }): boolean {
      if (!input.active) return false;
      if (scope !== input.scope) { scope = input.scope; reported = false; }
      if (input.pending) return false;
      if (input.failed) {
        if (reported) return false;
        reported = true;
        return true;
      }
      if (input.healthy) reported = false;
      return false;
    },
    // Call only after the user's command passes its current-owner guard.
    retry() { reported = false; },
  };
}

export type ResourceFailureEpisode = ReturnType<typeof createResourceFailureEpisode>;
