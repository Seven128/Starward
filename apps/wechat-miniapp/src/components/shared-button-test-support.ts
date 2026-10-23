import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

type ElementPort<Node> = (type: unknown, props: any, ...children: unknown[]) => Node;

const code = ts.transpileModule(readFileSync(new URL("./shared-button-press.tsx", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;

/** Exercise the real shared facade through the caller's existing native Button
 * port. This is not a native hover, touch-cancellation or press-timing test. */
export function sharedButtonTestBoundary<Node>(nativeElement: ElementPort<Node>, nativeButton: unknown = "Button", nativeView: unknown = "View") {
  const exported: Partial<Record<"SharedButton" | "PickerTrigger", (props: Record<string, any>) => Node>> = {};
  const nativeCreateElement: ElementPort<Node> = (type, props, ...children) => nativeElement(type, {
    ...props,
    ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}),
  }, ...children);
  vm.runInNewContext(code, { exports: exported, React: { createElement: nativeCreateElement }, require(name: string) {
    if (name === "@tarojs/components") return { Button: nativeButton, View: nativeView };
    if (name === "./shared-button-press.scss") return {};
    throw new Error(`unexpected_shared_button_dependency:${name}`);
  } });
  const SharedButton = exported.SharedButton!;
  const PickerTrigger = exported.PickerTrigger!;
  return {
    SharedButton, PickerTrigger,
    // Expand only these stateless facades, leaving each harness's other component
    // and hook boundaries intact. Both classic JSX and jsx-runtime can use it.
    element(type: unknown, props: any, ...children: unknown[]): Node {
      const facade = type === SharedButton ? SharedButton : type === PickerTrigger ? PickerTrigger : null;
      if (!facade) return nativeElement(type, props, ...children);
      return facade({ ...props, ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) });
    },
  };
}
