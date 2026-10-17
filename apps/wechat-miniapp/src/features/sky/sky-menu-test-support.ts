import assert from "node:assert/strict";
import ts from "typescript";

/** Public semantic props of the menu components. Source extraction remains
 * bounded command evidence; the full Taro consumer verifies composition. */
export function skyMenuProps(source: ts.SourceFile) {
  const docks = new Map<string, ts.JsxAttributes>();
  const layers = new Map<string, ts.JsxAttributes>();
  const headings = new Map<string, ts.JsxAttributes>();
  const text = (props: ts.JsxAttributes, name: string) => {
    const value = props.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === name) as ts.JsxAttribute | undefined;
    return value?.initializer && ts.isStringLiteral(value.initializer) ? value.initializer.text : undefined;
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node)) {
      const kind = node.tagName.getText(source);
      const group = kind === "SkyMenuAction" ? docks : kind === "SkyLayerToggle" ? layers : kind === "SkyPanelHeading" ? headings : null;
      const key = text(node.attributes, kind === "SkyMenuAction" ? "id" : kind === "SkyLayerToggle" ? "label" : "closeLabel");
      if (group && key) { assert(!group.has(key), key); group.set(key, node.attributes); }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const expression = (props: ts.JsxAttributes, name: string) => {
    const value = props.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === name) as ts.JsxAttribute | undefined;
    assert(value?.initializer && ts.isJsxExpression(value.initializer) && value.initializer.expression, name);
    return value.initializer.expression;
  };
  return { docks, layers, headings, expression,
    dock(kind: "time" | "list" | "calibration" | "layers") {
      const props = docks.get(kind === "list" ? "sky-orientation-object-list-toggle" : `sky-${kind}-toggle`);
      assert(props, kind); return expression(props, "onClick");
    },
  };
}
