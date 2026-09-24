/** The Mini Program currently supports mainland and Hong Kong timezone hints. */
export function currentTimezoneHint(): "Asia/Shanghai" | "Asia/Hong_Kong" {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Hong_Kong"
      ? "Asia/Hong_Kong"
      : "Asia/Shanghai";
  } catch {
    return "Asia/Shanghai";
  }
}
