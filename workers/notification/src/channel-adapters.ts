export type DeliveryStatus = "accepted" | "retry" | "permanent-failure" | "disabled";
export interface DeliveryRequest { idempotencyKey: string; token?: string; title: string; body: string; deepLink: string; critical: boolean }
export interface ChannelAdapter { id: "local" | "inbox" | "apns" | "fcm" | "vendor" | "expo-poc"; send(request: DeliveryRequest): Promise<{ status: DeliveryStatus; receiptId?: string; retryAfterSeconds?: number; reason?: string }> }
export function classifyChannelResponse(input: { statusCode: number; receiptId?: string; channel: ChannelAdapter["id"] }) {
  if (input.statusCode >= 200 && input.statusCode < 300) return { status: "accepted" as const, receiptId: input.receiptId, deviceDeliveryProven: false };
  if (input.statusCode === 429 || input.statusCode >= 500) return { status: "retry" as const, retryAfterSeconds: 60 };
  return { status: "permanent-failure" as const, disableToken: input.statusCode === 404 || input.statusCode === 410 };
}
export const channelPolicy = Object.freeze({ authoritativeMvp: ["local", "inbox"], productionRemoteRequiresPoc: true, expoPocOnly: true, safetyRequiresOpenAppRevalidation: true, guaranteesDelivery: false });

