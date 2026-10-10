import { onlineManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { recordAcceptanceDiagnostic } from "@/services/acceptance-diagnostics";

export interface QueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: (signal: AbortSignal | undefined) => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  throwOnRefetchError?: boolean;
  /** Integrity-validated immutable publications may use object identity as a
   * capability; Query must not rebuild them through structural sharing. */
  structuralSharing?: boolean;
}

type RefetchOptions = { cancelRefetch?: boolean };

export interface ResourceSnapshot<T> {
  data: T | undefined;
  error: unknown;
  isInvalidated: boolean;
  updatedAt: number;
}

type QueryResult<T> = (
  | {
      data: T;
      error: null;
      isError: false;
      isPending: false;
      refetch: (options?: RefetchOptions) => Promise<T | undefined>;
    }
  | {
      data: undefined;
      error: unknown;
      isError: true;
      isPending: false;
      refetch: (options?: RefetchOptions) => Promise<T | undefined>;
    }
  | {
      data: undefined;
      error: null;
      isError: false;
      isPending: true;
      refetch: (options?: RefetchOptions) => Promise<T | undefined>;
    }) & { refreshError?: unknown; isFetching: boolean; readCurrent(): ResourceSnapshot<T> };

export function useResourceQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 60_000,
  gcTime,
  refetchInterval = false,
  throwOnRefetchError = false,
  structuralSharing = true,
}: QueryOptions<T>): QueryResult<T> {
  const client = useQueryClient();
  // Native confirmations can settle before React receives a newer publication.
  // Read the same query owner synchronously before dispatching an external effect.
  const readCurrent = (): ResourceSnapshot<T> => {
    const current = client.getQueryState<T>(queryKey);
    return { data: current?.data, error: current?.error ?? null,
      isInvalidated: current?.isInvalidated ?? true, updatedAt: current?.dataUpdatedAt ?? 0 };
  };
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
    ...(gcTime === undefined ? {} : { gcTime }),
    refetchInterval,
    structuralSharing,
  });
  useEffect(() => {
    recordAcceptanceDiagnostic(
      diagnosticKey,
      "query_state",
      `${result.status}:${result.fetchStatus}:${onlineManager.isOnline() ? "online" : "offline"}`,
    );
  }, [diagnosticKey, result.fetchStatus, result.status]);
  const refetch = async (options?: RefetchOptions) => {
    const refreshed = await result.refetch({ ...options, throwOnError: throwOnRefetchError });
    return refreshed.error ? undefined : refreshed.data;
  };
  if (result.data !== undefined)
    return {
      data: result.data,
      error: null,
      isError: false,
      isPending: false,
      refetch,
      readCurrent,
      refreshError: result.error ?? undefined,
      isFetching: result.isFetching,
    };
  if (result.error !== null)
    return {
      data: undefined,
      error: result.error,
      isError: true,
      isPending: false,
      refetch,
      readCurrent,
      isFetching: result.isFetching,
    };
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: true,
    refetch,
    readCurrent,
    isFetching: result.isFetching,
  };
}
