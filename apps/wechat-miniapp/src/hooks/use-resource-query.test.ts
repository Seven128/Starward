import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { resourceQueryTestOwner } from "./use-resource-query-test-support";

test("the resource owner evaluates freshness against the current cached data", () => {
  let options: any;
  const hook = resourceQueryTestOwner({ useQuery: (value: any) => { options = value; return { data: undefined, error: null }; },
    useQueryClient: () => ({}), useEffect() {} });
  hook({ queryKey: ["partial"], queryFn: async () => ({ failed: false }), staleTime: (data: { failed?: boolean } | undefined) => data?.failed ? 0 : 86400000 });
  assert.equal(options.staleTime({ state: { data: { failed: true } } }), 0);
  assert.equal(options.staleTime({ state: { data: { failed: false } } }), 86400000);
});

test("cached resource survives refresh failure while exposing its stale cause", async () => {
  const data = { title: "cached" }, error = new Error("offline");
  let refetchError: Error | null = error;
  const result = { data: data as typeof data | undefined, error: error as Error | null, refetch: async () => ({ data, error: refetchError }) };
  const useResourceQuery = resourceQueryTestOwner({ useQuery: () => result, useQueryClient: () => ({ getQueryState: () => undefined }), useEffect() {} });
  const options = { queryKey: ["article"], queryFn: async () => data };
  const stale = useResourceQuery(options);
  assert.equal(stale.data, data);
  assert.equal(stale.isError, false);
  assert.equal(stale.refreshError, error);
  assert.equal(await stale.refetch(), undefined, "a failed refresh cannot report cached data as a fresh success");
  assert.equal(stale.data, data, "the displayed cache remains readable");
  refetchError = null;
  assert.equal(await stale.refetch(), data);
  result.error = null;
  assert.equal(useResourceQuery(options).refreshError, undefined);
  result.data = undefined;
  result.error = error;
  assert.equal(useResourceQuery(options).isError, true);
  result.error = null;
  assert.equal(useResourceQuery(options).isPending, true);
});

test("external commands read current query publications and failures before React rerenders", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["spot", "spot:current"];
  const old = { identity: "old" }, latest = { identity: "current" };
  client.setQueryData(key, old);
  const receivedAt = client.getQueryState(key)!.dataUpdatedAt;
  const hook = resourceQueryTestOwner({ useQuery: () => ({ data: old, error: null, dataUpdatedAt: receivedAt }), useQueryClient: () => client, useEffect() {} });
  const resource = hook({ queryKey: key, queryFn: async () => old });
  client.setQueryData(key, latest, { updatedAt: receivedAt + 5000 });
  assert.equal(resource.data, old, "the retained React result has not changed");
  assert.equal(resource.updatedAt, receivedAt, "forecast clock anchoring uses the receipt of the data actually being rendered");
  assert.deepEqual(resource.readCurrent().data, latest, "the native command observes the current publication");
  assert.equal(resource.readCurrent().updatedAt, receivedAt + 5000);
  await client.invalidateQueries({ queryKey: key, refetchType: "none" });
  assert.equal(resource.readCurrent().isInvalidated, true);
  const error = new Error("current transport failure");
  await assert.rejects(client.fetchQuery({ queryKey: key, queryFn: async () => { throw error; } }), error);
  assert.equal(resource.readCurrent().error, error);
  assert.deepEqual(resource.readCurrent().data, latest, "independent readable cached data is preserved");
  client.clear();
});
