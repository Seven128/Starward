const routeAliases: Record<string, string> = {
  "/contribute": "/community",
  "/me": "/profile",
  "/onboarding-preferences": "/",
  "/spot/spot-a": "/spots",
  "/toolbox": "/tools",
  "/trips": "/plans",
};

export function normalizeApplicationPathname(pathname: string) {
  const normalized = pathname.replace(/\/$/u, "") || "/";
  return routeAliases[normalized] ?? normalized;
}
