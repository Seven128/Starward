import vm from "node:vm";
import ts from "typescript";
import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions } from "./sky-deep-auxiliary-visibility";

/** Execute the actual page's staged painted/done/accepted callbacks. Controlled
 * dependencies are supplied by each requirement test; this is not native/GPU evidence. */
export function skyPagePaintCommit(source: ts.SourceFile, bindings: Record<string, unknown>) {
  let painted: ts.Expression | undefined, completed: ts.Expression | undefined, presented: ts.Expression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "drawSkyScene") {
      painted = node.arguments[8]; completed = node.arguments[9];
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "presented") presented = node.initializer;
    ts.forEachChild(node, find);
  };
  find(source);
  if (!painted || !completed || !presented) throw new Error("sky_page_paint_callbacks_missing");
  const frame = bindings.frame;
  const context = vm.createContext({ liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput,
    copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions,
    setCanvasSize: () => {}, publishAcceptanceSkySceneInspection: () => {}, setCanvasError: () => {},
    canvasDrawRevisionRef: { current: 0 },
    context: {}, setArtworkContributionUnavailable: () => {},
    ...bindings, paintAttempt: { frame, generation: 1, publish: null },
    pendingSkyPaintRef: { current: null }, canvasGenerationRef: { current: 1 } });
  const execute = (expression: ts.Expression) => vm.runInContext(ts.transpileModule(`(${expression.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const stage = execute(painted), accept = execute(presented);
  context.done = () => accept(frame, { width: 390, height: 844 });
  const complete = execute(completed);
  return Object.assign((snapshot: unknown, sources: unknown) => { stage(snapshot, sources); complete(); },
    { stage, complete, accept, context });
}
