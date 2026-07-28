import { describe, expect, it } from "vitest";
import { designControlAccessibilityState } from "../shell/design-control-state";

describe("design control accessibility state", () => {
  it("explicitly clears native semantic flags when a forced state exits", () => {
    expect(designControlAccessibilityState("disabled")).toEqual({
      busy: false,
      disabled: true,
      selected: false,
    });
    expect(designControlAccessibilityState("loading")).toEqual({
      busy: true,
      disabled: false,
      selected: false,
    });
    expect(designControlAccessibilityState("selected")).toEqual({
      busy: false,
      disabled: false,
      selected: true,
    });
    expect(designControlAccessibilityState("default")).toEqual({
      busy: false,
      disabled: false,
      selected: false,
    });
  });
});
