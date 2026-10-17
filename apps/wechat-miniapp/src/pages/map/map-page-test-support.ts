/** Explicit idle page boundaries for tests that execute selected Map callbacks.
 * Unknown globals are deliberately not supplied: a new dependency must be
 * understood by the consumer, rather than becoming a permissive no-op mock.
 */
export function createMapPageTestBoundaries() {
  const calls: string[] = [];
  return {
    calls,
    scope: {
      mapReturnPhase: { current: null as "waiting" | "revealing" | null },
      mapReturnPresentation: null as "waiting" | "revealing" | null,
      skyEntryPresentation: null as number | null,
      skyEntry: {
        isActive: () => false,
        show: () => calls.push("sky-show"),
        hide: () => calls.push("sky-hide"),
        cancel: () => calls.push("sky-cancel"),
      },
      login: { open: false },
      spotMapFocus: {
        begin: (identity: string) => calls.push(`focus:${identity}`),
        cancel: () => calls.push("focus-cancel"),
      },
      cancelLocation: () => calls.push("location-cancel"),
      revealReturnedMap: (ready: boolean) => calls.push(`map-return:${ready}`),
    },
  };
}
