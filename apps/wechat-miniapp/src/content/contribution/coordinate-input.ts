/** Decimal degrees only: an empty field is missing, never zero. */
export function parseCoordinateInput(value: string): number {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(text)) return Number.NaN;
  return Number(text);
}
