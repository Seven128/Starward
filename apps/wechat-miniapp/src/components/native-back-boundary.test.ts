import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

test("custom modal owners share one native WEAPP Back boundary", () => {
  const boundary = source("./native-back-boundary.tsx");
  assert.match(boundary, /<PageContainer/u);
  assert.match(boundary, /useState\(false\)/u);
  assert.match(boundary, /if \(!present && !nativeMapContent\) return null/u);
  assert.match(boundary, /<PageContainer\s+show=\{active && armed\}/u);
  assert.doesNotMatch(boundary, /RootPortal/u);
  assert.match(boundary, /onBeforeLeave=\{handleLeave\}/u);
  assert.match(boundary, /onAfterLeave: handleLeave/u);
  assert.match(boundary, /leaveHandled\.current/u);
  assert.match(boundary, /if \(activeRef\.current\) setArmed\(true\)/u);

  const nickname = source("../features/my/my-nickname.tsx");
  const nicknameVisible = nickname.match(/\{(\w+) \? <View className="my-nickname-overlay"/u)?.[1];
  assert.ok(nicknameVisible, "nickname's editor has an explicit visibility owner");
  assert.match(nickname, new RegExp(`NativeBackBoundary active=\\{${nicknameVisible}\\} onBack=\\{cancel\\}`, "u"),
    "nickname's native Back layer follows the same current-account visibility as its editor");
  const avatar = source("../features/my/my-avatar.tsx");
  assert.equal(avatar.match(/<NativeBackBoundary\b/gu)?.length, 1, "avatar sheet and red handoff share one native owner");
  const avatarPreviewVisible = avatar.match(/\{(\w+) && preview \? <View className="my-avatar-overlay"/u)?.[1];
  assert.ok(avatarPreviewVisible, "avatar's preview has an explicit visibility owner");
  assert.match(avatar, new RegExp(`NativeBackBoundary active=\\{sheet \\|\\| ${avatarPreviewVisible} \\|\\| mediaHandoff\\.active\\}`, "u"),
    "avatar's native Back layer follows its visible sheet, current-account preview or media handoff");
  assert.match(avatar, /mediaHandoff\.active \? mediaHandoff\.cancel\(\) : close\(\)/u);
  assert.match(avatar, /useRedLightHandoff\(\{ nativeBackBoundary: false \}\)/u);
  assert.match(source("../content/settings/index.tsx"), /NativeBackBoundary active=\{Boolean\(sheet\)\} onBack=\{closeSheet\}/u);
  assert.match(source("../pages/map/search-page.tsx"), /NativeBackBoundary active=\{filterSheetOpen\} onBack=\{cancelFilters\}/u);
  assert.match(source("./observation-date-control.tsx"), /<NativeBackBoundary[\s\S]*active=\{open\}[\s\S]*if \(!busy\) onOpenChange\(false\)/u);
  const sky = source("../features/sky/spot-sky-page.tsx");
  assert.equal(sky.match(/<NativeBackBoundary\b/gu)?.length, 1, "date and object disclosures share one native owner");
  assert.match(sky, /active=\{pageVisible && Boolean\(datePickerOpen \|\| selectedTargetId \|\| selectedCatalogObject \|\| catalogPickChoices\.length\)\}[\s\S]*onBack=\{goBack\}/u);
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
