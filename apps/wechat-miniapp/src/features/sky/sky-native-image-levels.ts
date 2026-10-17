/** Resolve existing native images only. Selection never requests a hidden
 * level; the native loader owns retention pressure, identity and retirement. */
export function skyNativeImageLevels<Level extends string>(order: readonly Level[],
  wanted: Level | null, image: (level: Level) => object | null) {
  const index = wanted === null ? -1 : order.indexOf(wanted);
  const primary = index < 0 ? null : image(wanted!) ? wanted :
    [...order.slice(0, index).reverse(), ...order.slice(index + 1)].find(level => image(level)) ?? null;
  const primaryIndex = primary === null ? -1 : order.indexOf(primary);
  return {
    primary,
    coarser: primaryIndex < 0 ? null : order.slice(0, primaryIndex).reverse().find(level => image(level)) ?? null,
    fallback: primaryIndex < 0 ? null : order.slice(primaryIndex + 1).find(level => image(level)) ?? null,
  };
}
