import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isTemporaryCacheKey, responseCacheKey } from "./cache-policy";
import { QueryClient } from "@tanstack/react-query";
import { createResponseCache, isResponseEnvelope, MAX_STALE_AGE_MS } from "./response-cache";
import { LatestRequestRegistry, MiniappRequestCancelled } from "./request-lifecycle";
// Execute the production transport/cache functions; only native I/O and time
// delivery are synthetic. No phone, persistent user cache or credentials.
export const TEST_API_BASE = "https://synthetic.invalid";
export function transportHarness(abortThrows = false, onDispatch = () => {}, promiseTask = false, apiBase = TEST_API_BASE) {
  const source = ts.createSourceFile("api-client.ts",
    readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true);
  const names = new Set([
    "request", "abortTask", "staleCandidate", "isEnvelope", "isApiError",
    "MiniappApiError", "responseCache", "requests", "invalidateApiCache", "clearTemporaryApiCache",
  ]);
  const declarations: string[] = [];
  for (const node of source.statements) {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && names.delete(node.name.text))
      declarations.push(node.getText(source).replace(/^export /u, ""));
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (names.delete(declaration.name.getText(source))) declarations.push(node.getText(source));
      }
    }
  }
  assert.equal(names.size, 0, `missing production declarations: ${[...names]}`);
  type Response = { statusCode: number; data: unknown };
  type Call = { header: Record<string, string>; data?: unknown; success(response: Response): void; fail(error: { errMsg: string }): void };
  const calls: Call[] = [];
  const taskRejections: ((error: { errMsg: string }) => void)[] = [];
  const timers = new Map<number, () => void>();
  const diagnostics: string[][] = [];
  let timerId = 0;
  let aborts = 0;
  let writes = 0;
  const storage = new Map<string, unknown>();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const actual = vm.runInNewContext(ts.transpileModule(declarations.join("\n") +
    "\n({request, requests, responseCache, invalidateApiCache, clearTemporaryApiCache});", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    LatestRequestRegistry, MiniappRequestCancelled, responseCacheKey, createResponseCache, isResponseEnvelope, MAX_STALE_AGE_MS, Date, Error,
    isTemporaryCacheKey, miniappQueryClient: queryClient,
    __MINIAPP_API_BASE__: apiBase, __MINIAPP_OPERATOR_PREVIEW_TOKEN__: "",
    __MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__: false,
    recordAcceptanceDiagnostic: (...parts: string[]) => diagnostics.push(parts),
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    Taro: {
      getEnv: () => "WEAPP", getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => { writes++; storage.set(key, value); },
      setStorage: async ({ key, data }: { key: string; data: unknown }) => { storage.set(key, data); },
      removeStorageSync: (key: string) => { storage.delete(key); },
      getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
      request: (call: Call) => {
        let resolveTask!: (response: Response) => void;
        let rejectTask!: (error: { errMsg: string }) => void;
        const promise = promiseTask ? new Promise<Response>((resolve, reject) => {
          resolveTask = resolve;
          rejectTask = reject;
        }) : null;
        const nativeCall: Call = promise ? {
          header: call.header, data: call.data,
          success: (response) => { call.success(response); resolveTask(response); },
          fail: (error) => { call.fail(error); rejectTask(error); },
        } : call;
        if (promise) taskRejections.push(rejectTask);
        calls.push(nativeCall);
        onDispatch();
        const methods = { abort: () => {
          aborts++;
          if (abortThrows) throw new Error("synthetic abort failure");
          nativeCall.fail({ errMsg: "request:fail abort" });
        } };
        return promise ? Object.assign(promise, methods) : methods;
      },
    },
  }, { timeout: 1000 }) as {
    request(key: string, path: string, options?: { cache?: boolean; signal?: AbortSignal; method?: "DELETE"; body?: unknown; session?: { userId: string; accessToken: string } }): Promise<typeof response>;
    requests: LatestRequestRegistry;
    responseCache: ReturnType<typeof createResponseCache>;
    invalidateApiCache(prefix?: string): void;
    clearTemporaryApiCache(): Promise<number>;
  };
  const response = {
    apiVersion: "v2", generatedAt: new Date().toISOString(), requestId: "synthetic-request",
    etag: "synthetic-etag", dataState: "FRESH", warnings: [] as string[],
    sources: [{ kind: "PROVIDER" }], data: { value: "synthetic cached payload" },
  };
  return { ...actual, calls, timers, diagnostics, response, taskRejections, storage, queryClient,
    flush: () => actual.responseCache.flush(),
    counts: () => ({ aborts, writes }),
    timeout: () => { const callback = timers.values().next().value; assert.ok(callback); callback(); },
    seed: async (envelope = response) => {
      const pending = actual.request("scene", "/scene");
      calls.at(-1)!.success({ statusCode: 200, data: envelope });
      await pending;
      await actual.responseCache.flush();
    },
  };
}
