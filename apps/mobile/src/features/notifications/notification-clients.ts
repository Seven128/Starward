import { createNotificationInboxClient } from "../../data/notification-inbox-client";
import { resolveRuntimeApiBaseUrl } from "../../data/runtime-api-base-url";

/** The two notification surfaces share one authority observation lifetime. */
export const defaultNotificationInboxClient = createNotificationInboxClient({ baseUrl: resolveRuntimeApiBaseUrl() });
