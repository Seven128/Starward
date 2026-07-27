export function normalizeApplicationPathname(pathname: string) {
  return pathname.replace(/\/$/u, "") || "/";
}
