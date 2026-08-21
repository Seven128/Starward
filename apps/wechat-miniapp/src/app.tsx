import { useLaunch } from "@tarojs/taro";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { miniappQueryClient } from "@/services/query-client";
import { resetApiClientForAcceptance } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { resetAppStoreForAcceptance } from "@/state/app-store";
import { syncNativeChrome } from "@/theme/native-chrome";
import { FloatingNotificationHost } from "@/components/notification";
import "./app.scss";

if (__MINIAPP_ACCEPTANCE_DIAGNOSTICS__) {
  const runtime = globalThis as typeof globalThis & {
    __STARWARD_MINIAPP_ACCEPTANCE__?: {
      reset(): {
        status: "passed";
        cancelledRequests: number;
        snapshot: unknown;
      };
    };
  };
  runtime.__STARWARD_MINIAPP_ACCEPTANCE__ = {
    reset() {
      const cancelledRequests = resetApiClientForAcceptance();
      miniappQueryClient.clear();
      const snapshot = resetAppStoreForAcceptance();
      return { status: "passed", cancelledRequests, snapshot };
    },
  };
}

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    void syncNativeChrome(useAppStore.getState().mode).catch(
      (error: unknown) => {
        console.warn("launch_native_chrome_sync_failed", error);
      },
    );
  });
  return (
    <QueryClientProvider client={miniappQueryClient}>
      {/* Taro H5 requires the active taro_page to remain the last router child. */}
      <FloatingNotificationHost />
      {children}
    </QueryClientProvider>
  );
}
