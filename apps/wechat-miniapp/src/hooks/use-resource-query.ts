import { onlineManager, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { recordAcceptanceDiagnostic } from "@/services/acceptance-diagnostics";

interface QueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: (signal: AbortSignal | undefined) => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
}

type QueryResult<T> =
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
    };

export function useResourceQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 60_000,
}: QueryOptions<T>): QueryResult<T> {
  const diagnosticKey = String(queryKey[0] ?? "resource-query");
  const result = useQuery<T>({
    queryKey,
    queryFn: () => {
      recordAcceptanceDiagnostic(diagnosticKey, "query_fn", "begin");
      // WEAPP cancellation is owned by the RequestTask registry. Reading
      // TanStack's AbortSignal would introduce a second lifecycle owner.
      return queryFn(undefined);
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
  const refetch = async () => (await result.refetch()).data;
  if (result.data !== undefined)
    return {
      data: result.data,
      error: null,
      isError: false,
      isPending: false,
      refetch,
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
