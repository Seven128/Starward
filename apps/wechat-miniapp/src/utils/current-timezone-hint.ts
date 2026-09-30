/** A compatibility hint; the server determines browsing timezones from location. */
export function currentTimezoneHint(): "Asia/Shanghai" | "Asia/Hong_Kong" | "Asia/Macau" {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === "Asia/Hong_Kong") return "Asia/Hong_Kong";
    if (zone === "Asia/Macau" || zone === "Asia/Macao") return "Asia/Macau";
    return "Asia/Shanghai";
  } catch {
    return "Asia/Shanghai";
  }
}
