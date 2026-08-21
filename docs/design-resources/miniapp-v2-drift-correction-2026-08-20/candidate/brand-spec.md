# Soft Instruments binding

This candidate binds the canonical `target.system.wechat-miniapp-soft-instruments-2026-08-05` profile: cool, calm instrument surfaces; native Chinese typography; compact one-column phone geometry; one selective soft-object moment; and role-isomorphic day, night, and closed observation-red modes.

## Core aliases

These aliases are documentation-only. Runtime CSS keeps the canonical hexadecimal role values verbatim to avoid conversion drift.

```css
:root {
  --bg: oklch(97.80% 0.0062 255.5);      /* canvas #F5F8FC */
  --surface: oklch(100% 0 0);            /* surface #FFFFFF */
  --fg: oklch(25.65% 0.0587 258.0);      /* text-primary #10233F */
  --muted: oklch(51.54% 0.0503 250.8);   /* text-secondary #526A84 */
  --border: oklch(90.38% 0.0227 248.1);  /* border #D4E1EE */
  --accent: oklch(53.57% 0.1786 257.5);  /* primary #1769D2 */
}
```

## Type stacks

- Display: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
- Mono/data: `ui-monospace, "SFMono-Regular", Consolas, monospace`

## Observed posture rules

1. Use 16px page insets, 12px card gaps, 14px card padding, 44px minimum targets, 56px bottom-nav items, 0.5px hairlines, and 1px selected structural strokes as the authored 375px CSS realization of the 750rpx system; subpixel rasterization at non-integer device scaling is outside this static candidate's guarantee.
2. Keep decisions first, evidence second, and source/freshness last; never stack elevated cards.
3. Use one primary action per decision layer and planar Tier-A SVG symbols for controls.
4. Preserve identical semantic roles across day, night, and observation; observation is strictly black and warm red.
5. Let uncertainty, data state, shape, label, border, and position carry meaning together; color is never the only state channel.
