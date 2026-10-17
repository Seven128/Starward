const hiddenStyle = Object.freeze({ display: "none" as const });
const visibleStyle = Object.freeze({});

/** The current WEAPP View/ScrollView templates publish style, but omit hidden.
 * Hide retained controls through that supported port without unmounting their
 * queries, drafts or tracking subscriptions. Each disclosure owns its predicate.
 */
export function skyRetainedLayerStyle(hidden: boolean) {
  return hidden ? hiddenStyle : visibleStyle;
}
