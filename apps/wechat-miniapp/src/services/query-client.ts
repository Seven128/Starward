import { QueryClient } from "@tanstack/react-query";
import { installAbortControllerPolyfill } from "./platform-polyfills";

installAbortControllerPolyfill();

export const miniappQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
