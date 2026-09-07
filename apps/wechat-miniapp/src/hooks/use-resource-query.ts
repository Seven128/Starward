import { onlineManager, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { recordAcceptanceDiagnostic } from "@/services/acceptance-diagnostics";

interface QueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: (signal: AbortSignal | undefined) => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  throwOnRefetchError?: boolean;
}

type QueryResult<T> = (
  | {
      data: T;
      error: null;
      isError: false;
      isPending: false;
      refetch: () => Promise<T | undefined>;
    }
  | {
      data: undefined;
      error: unknown;
      isError: true;
      isPending: false;
      refetch: () => Promise<T | undefined>;
    }
  | {
      data: undefined;
      error: null;
      isError: false;
      isPending: true;
      refetch: () => Promise<T | undefined>;
    }) & { refreshError?: unknown };

export function useResourceQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 60_000,
  throwOnRefetchError = false,
}: QueryOptions<T>): QueryResult<T> {
  const diagnosticKey = String(queryKey[0] ?? "resource-query");
  const result = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) => {
      recordAcceptanceDiagnostic(diagnosticKey, "query_fn", "begin");
      // Query owns subscription lifetime; the transport owns native cleanup.
      return queryFn(signal);
    },
    enabled,
    staleTime,
  });
  useEffect(() => {
    recordAcceptanceDiagnostic(
      diagnosticKey,
      "query_state",
      `${result.status}:${result.fetchStatus}:${onlineManager.isOnline() ? "online" : "offline"}`,
    );
  }, [diagnosticKey, result.fetchStatus, result.status]);
  const refetch = async () => {
    const refreshed = await result.refetch({ throwOnError: throwOnRefetchError });
    return refreshed.error ? undefined : refreshed.data;
  };
  if (result.data !== undefined)
    return {
      data: result.data,
      error: null,
      isError: false,
      isPending: false,
      refetch,
      refreshError: result.error ?? undefined,
    };
  if (result.error !== null)
    return {
      data: undefined,
      error: result.error,
      isError: true,
      isPending: false,
      refetch,
    };
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: true,
    refetch,
  };
}
