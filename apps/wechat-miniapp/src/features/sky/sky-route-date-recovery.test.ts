import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { civilDateForInstant, observationDateOptions } from "../../components/observation-date";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
const statements = page.body!.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration => ["selectedCivilDate", "dateOptions"].includes(declaration.name.getText(source))));
assert.equal(statements.length, 2);
const code = ts.transpileModule(statements.map(statement => statement.getText(source)).join("\n") +
  "\n({ selectedCivilDate, dateOptions });", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const instant = "2026-09-28T16:00:00.000Z";
class FixedDate extends Date { constructor() { super(instant); } }
function derive(contextComplete: boolean, timezone: string, useMemo: (factory: () => unknown, deps: unknown[]) => unknown = factory => factory()) {
  const value = vm.runInNewContext(code, { contextComplete, routeContext: { timezone }, presentedAt: instant,
    civilDateForInstant, observationDateOptions, Date: FixedDate, useMemo });
  return { date: value.selectedCivilDate, options: [...value.dateOptions] as string[] };
}

test("incomplete or invalid route time cannot throw before the existing Context recovery view", () => {
  for (const timezone of ["", "Asia%2FShanghai", "not-a-timezone", "Asia/Shanghai"]) {
    assert.deepEqual(derive(false, timezone), { date: "", options: [] });
  }
});

test("Context lookup completion refreshes memoized date choices without a timezone change", () => {
  let previous: unknown[] | undefined, value: unknown;
  const memo = (factory: () => unknown, deps: unknown[]) => {
    if (!previous || previous.length !== deps.length || deps.some((item, index) => !Object.is(item, previous![index]))) {
      previous = [...deps]; value = factory();
    }
    return value;
  };
  assert.deepEqual(derive(false, "Asia/Shanghai", memo), { date: "", options: [] });
  const resolved = derive(true, "Asia/Shanghai", memo);
  assert.equal(resolved.options[7], "2026-09-29"); assert.equal(resolved.options.length, 23);
  assert.deepEqual(derive(false, "Asia/Shanghai", memo), { date: "", options: [] });
});

test("resolved Context still uses the shared civil-date owner across midnight and timezone changes", () => {
  const china = derive(true, "Asia/Shanghai"), utc = derive(true, "UTC");
  assert.equal(china.date, "2026-09-29"); assert.equal(china.options[7], "2026-09-29");
  assert.equal(utc.date, "2026-09-28"); assert.equal(utc.options[7], "2026-09-28");
  assert.equal(china.options.length, 23); assert.equal(china.options[0], "2026-09-22");
  assert.equal(china.options.at(-1), "2026-10-14");
});
