import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createPrimaryNavigationController, type PrimaryNativePage } from "./primary-navigation-controller";

/** Execute the production dispatcher while replacing only its native ports. */
export function primaryPageNavigationForTest(taro: object) {
  const owner = { exports: {} };
  const source = readFileSync(new URL("./primary-page-navigation.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, { module: owner, exports: owner.exports, require(name: string) {
    if (name === "@tarojs/taro") return { __esModule: true, default: taro };
    throw new Error(`Unexpected primary navigation dependency: ${name}`);
  } });
  return owner.exports as typeof import("./primary-page-navigation");
}

export type PrimaryPageNativeTestCall = {
  kind: "navigateBack" | "reLaunch";
  delta?: number;
  url?: string;
  resolve(): void;
  reject(error: unknown): void;
};

/** Explicit native ports: acceptance, the resulting stack and real show are separate test actions. */
export function primaryPageNativeRuntimeForTest(initialStack: PrimaryNativePage[], onNativeCall?: (call: PrimaryPageNativeTestCall) => void) {
  let stack = initialStack, stackError: Error | null = null;
  const calls: PrimaryPageNativeTestCall[] = [];
  const currentPages = () => {
    if (stackError) throw stackError;
    return stack;
  };
  const request = (kind: PrimaryPageNativeTestCall["kind"], options: { delta?: number; url?: string } = {}) =>
    new Promise<void>((resolve, reject) => {
      const call = { kind, ...options, resolve, reject };
      calls.push(call); onNativeCall?.(call);
    });
  const taro = {
    getCurrentPages: currentPages,
    navigateBack: (options?: { delta?: number }) => request("navigateBack", options),
    reLaunch: (options: { url: string }) => request("reLaunch", options),
  };
  const dispatcher = primaryPageNavigationForTest(taro);
  const hosts = new Map<PrimaryNativePage, {
    controller: ReturnType<typeof createPrimaryNavigationController>;
    detach(): void;
  }>();
  return {
    taro, dispatcher, calls,
    setStack(next: PrimaryNativePage[]) { stack = next; },
    setStackError(error: Error | null) { stackError = error; },
    showMap(page: PrimaryNativePage) {
      let host = hosts.get(page);
      if (!host) {
        const controller = createPrimaryNavigationController({ currentPage: () => currentPages().at(-1) });
        host = { controller, detach: dispatcher.registerPrimaryMapHost(controller) };
        hosts.set(page, host);
      }
      return host.controller.show(page);
    },
    hideMap(page: PrimaryNativePage) { hosts.get(page)?.controller.hide(); },
    dispose() {
      for (const host of hosts.values()) { host.detach(); host.controller.dispose(); }
      hosts.clear();
    },
  };
}
