# Sky Canvas / WXML composition inspection

2026-10-18. Bounded read-only inspection; root owns the live DevTools session and candidate build. No product code, renderer, service, build or DevTools state was changed by this reviewer.

## Observed mismatch

- Inspected `tmp/sky-ready.png`: the sky image is present; the left observer identity and right menu are not visibly present.
- Root's official element readback reports the menu at `(326.4, 96.91)`, `52×52`, opacity `1`; observer at `(12, 59)`, `70×42`, opacity `1`; sky host at `(0,0)`, `390.4×844`, opacity `1`. Element tap can operate the menu. These establish layout/state, not visible composition.
- Current `spot-sky-page.tsx` declares a `type="2d"` Canvas. Emitted `dist/weapp/base.wxml` retains the Canvas `type` binding. The source and emitted WXSS position the sky host at z-index `0`, observer at `8`, menu at `12`. No rule inspected hides those two controls in the reported state.
- The page's existing entry animation applies opacity `0→1` over `220ms`; no fill mode retains the zero endpoint. Parent opacity must still be read from the live page before ruling out an ancestor animation/composition issue.
- The new always-active auxiliary `NativeBackBoundary` has an empty transparent `1px` content surface and z-index `1`, with `overlay=false`. The former disclosure-only boundary has been replaced, not duplicated. No second concurrent PageContainer was found in this Sky page.

## Platform contract checked

The following official pages were read over HTTPS on 2026-10-18 (the web tool's direct opens failed; ordinary HTTPS returned the official content):

- [Canvas](https://developers.weixin.qq.com/miniprogram/dev/component/canvas.html): the new 2D Canvas supports same-layer rendering.
- [Native components](https://developers.weixin.qq.com/miniprogram/dev/component/native-component.html): same-layer rendering removes the old native-versus-WebView stacking restrictions; DevTools simulates native components using web components and may not reproduce device behavior. Same-layer render failure is a distinct runtime condition.
- [PageContainer](https://developers.weixin.qq.com/miniprogram/dev/component/page-container.html): z-index and overlay are supported; only one PageContainer may exist on a page.

The legacy claim that every Canvas necessarily covers every WXML view regardless of z-index does not apply to this declared 2D Canvas. Converting the interface to CoverView or changing the renderer is not justified by current evidence.

## Smallest next discriminators

Root should run only as needed, serially, keeping the same route, camera and compiled candidate:

1. Read parent `.sky-orientation-page` opacity / animation state and current Canvas `type`. The children's opacity alone does not exclude a transparent ancestor.
2. If parent opacity is `1`, make one temporary diagnostic candidate that omits only `exitBoundary`; compare the same visible observer/menu. A changed result identifies the new container interaction; an unchanged result rules it out for this symptom. Restore normal Back ownership afterward.
3. Only if still unresolved, temporarily hide the main Canvas in the diagnostic candidate while retaining WXML. If controls appear, the discrepancy is Canvas composition/capture ordering; if they remain absent, investigate the WXML ancestor/capture boundary instead. This is a diagnostic, not a production fallback or a reason to blank the sky during use.

No deterministic product-code defect or verified minimum production fix has been established by this read-only review. Do not raise z-index speculatively: the declared order is already correct. If the new boundary is causal, keep the existing single Back command owner and repair its container lifetime/layout; do not install a second competing PageContainer. If the mismatch is confined to simulator capture, preserve product rendering and retain target-device composition as unverified.

The requested whole-page exit blackout is not proven by an opaque WXML shield's state or CSS. It needs an actual composed result covering Canvas plus controls before being accepted. This review does not close UI06, device acceptance, or the transition's visible runtime evidence.
