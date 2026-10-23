import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { installAbortControllerPolyfill } from "./platform-polyfills";
import { isMiniappRequestCancelled } from "./request-lifecycle";
import { reportRuntimeError } from "./runtime-error";

installAbortControllerPolyfill();

export const miniappQueryClient = new QueryClient({
  queryCache: new QueryCache({ onError(error) {
    if (!isMiniappRequestCancelled(error)) reportRuntimeError("query", "query_failed", error);
  } }),
  mutationCache: new MutationCache({ onError(error) {
    if (!isMiniappRequestCancelled(error)) reportRuntimeError("mutation", "mutation_failed", error);
  } }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      // Cancellation retires obsolete demand; it is not a failed network
      // attempt whose backoff should hold up a later return to the same key.
      retry: (failureCount, error) => !isMiniappRequestCancelled(error) && failureCount < 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
