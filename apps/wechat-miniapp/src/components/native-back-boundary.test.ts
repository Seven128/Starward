import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

test("custom modal owners share one native WEAPP Back boundary", () => {
  const boundary = source("./native-back-boundary.tsx");
  assert.match(boundary, /<PageContainer/u);
  assert.match(boundary, /useState\(false\)/u);
  assert.match(boundary, /if \(!present\) return null/u);
  assert.match(boundary, /<PageContainer\s+show=\{active && armed\}/u);
  assert.doesNotMatch(boundary, /RootPortal/u);
  assert.match(boundary, /onBeforeLeave=\{handleLeave\}/u);
  assert.match(boundary, /onAfterLeave=\{handleLeave\}/u);
  assert.match(boundary, /leaveHandled\.current/u);
  assert.match(boundary, /if \(activeRef\.current\) setArmed\(true\)/u);

  assert.match(source("../features/my/my-nickname.tsx"), /NativeBackBoundary active=\{editing\} onBack=\{cancel\}/u);
  assert.match(source("../features/my/my-avatar.tsx"), /NativeBackBoundary active=\{sheet \|\| Boolean\(preview\)\} onBack=\{close\}/u);
  assert.match(source("../content/settings/index.tsx"), /NativeBackBoundary active=\{Boolean\(sheet\)\} onBack=\{closeSheet\}/u);
  assert.match(source("../pages/map/search-page.tsx"), /NativeBackBoundary active=\{filterSheetOpen\} onBack=\{cancelFilters\}/u);
  assert.match(source("./observation-date-control.tsx"), /<NativeBackBoundary[\s\S]*active=\{open\}[\s\S]*if \(!busy\) onOpenChange\(false\)/u);
  assert.match(source("../features/sky/spot-sky-page.tsx"), /active=\{Boolean\(selectedTargetId \|\| selectedCatalogObject \|\| catalogPickChoices\.length\)\}[\s\S]*onBack=\{goBack\}/u);
});

test("the astronomical event modal keeps its native Back layer outside the visible RootPortal", () => {
  const modal = source("./astronomical-event-modal.tsx");
  assert.match(modal, /nativeBackBoundary \? <NativeBackBoundary active onBack=\{requestClose\} \/> : null/u);
  assert.doesNotMatch(modal, /<RootPortal>\s*<NativeBackBoundary/u);
  const map = source("../pages/map/index.tsx");
  assert.match(map, /eventModalOpen \|\| bottomPresentation === "spot-panel"/u);
  assert.match(map, /eventModalRef\.current\?\.back\(\)/u);
  assert.match(map, /nativeBackBoundary=\{false\}/u);
});
