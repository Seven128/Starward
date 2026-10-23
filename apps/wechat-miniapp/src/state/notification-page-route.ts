import { currentPresentedPageRoute } from "@/navigation/primary-page-navigation";

export function currentNotificationPageRoute(): string | undefined {
  try {
    return currentPresentedPageRoute()?.replace(/^\/+/, "") || undefined;
  } catch {
    return undefined;
  }
}
