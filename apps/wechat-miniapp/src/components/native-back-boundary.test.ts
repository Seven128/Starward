import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

test("custom modal owners share one native WEAPP Back boundary", () => {
  const boundary = source("./native-back-boundary.tsx");
  assert.match(boundary, /<PageContainer/u);
  assert.doesNotMatch(boundary, /RootPortal/u);

  assert.match(source("../features/my/my-nickname.tsx"), /NativeBackBoundary active=\{editorVisible\} onBack=\{cancel\}/u);
  const avatar = source("../features/my/my-avatar.tsx");
  assert.equal(avatar.match(/<NativeBackBoundary\b/gu)?.length, 1, "avatar sheet and red handoff share one native owner");
  assert.match(avatar, /NativeBackBoundary active=\{sheet \|\| previewVisible \|\| mediaHandoff\.active\}/u);
  assert.match(avatar, /mediaHandoff\.active \? mediaHandoff\.cancel\(\) : close\(\)/u);
  assert.match(avatar, /useRedLightHandoff\(\{ nativeBackBoundary: false \}\)/u);
  assert.match(source("../content/settings/index.tsx"), /NativeBackBoundary active=\{login\.open \|\| Boolean\(sheet\)\} onBack=\{login\.open \? login\.back : closeSheet\}/u);
  assert.match(source("../pages/map/search-page.tsx"), /NativeBackBoundary active=\{login\.open \|\| filterSheetOpen\} onBack=\{login\.open \? login\.back : cancelFilters\}/u);
  assert.match(source("./observation-date-control.tsx"), /<NativeBackBoundary[\s\S]*active=\{open\}[\s\S]*if \(!busy\) onOpenChange\(false\)/u);
  const sky = source("../features/sky/spot-sky-page.tsx");
  assert.equal(sky.match(/<NativeBackBoundary\b/gu)?.length, 1, "disclosures and whole-page exit share one native owner");
  assert.match(sky, /const exitBoundary = <NativeBackBoundary active=\{pageVisible\}/u,
    "Sky must intercept Back even with no open disclosure, including recovery states");
  assert.match(sky, /onBack=\{\(\) => \{ if \(!closingOverlay\) return goBack\(\); \}\}/u);
  assert.equal(sky.match(/\{exitBoundary\}/gu)?.length, 3, "loading, recovery and ready page branches retain the same boundary");
  // Disclosure-first Back and asynchronous whole-page return are exercised
  // through the production commands in sky-page-navigation-ownership.test.ts.
});

test("the astronomical event modal keeps its native Back layer outside the visible RootPortal", () => {
  const modal = source("./astronomical-event-modal.tsx");
  assert.match(modal, /nativeBackBoundary \? <NativeBackBoundary active onBack=\{requestClose\} \/> : null/u);
  assert.doesNotMatch(modal, /<RootPortal>\s*<NativeBackBoundary/u);
  const map = source("../pages/map/index.tsx");
  assert.match(map, /eventModalOpen \|\| eventModalPresent \|\| bottomPresentation === "spot-panel"/u);
  assert.match(map, /eventModalRef\.current\?\.back\(\)/u);
  assert.match(map, /nativeBackBoundary=\{false\}/u);
});
