# C05 Saturn oblate globe: official WEAPP DevTools native pixel A/B

At the existing `MEMORY_TEST` example point `spot:test-published`, the current Map action entered Sky, the official date control selected local 2026-10-08, the object list selected the real catalogue `PLANET:SATURN`, and “定位到星空” centred it. Four two-finger native Canvas gestures reached the actual 0.15° vertical FOV. The accessible canvas label reported the same 2026-10-08T10:00:00.000Z scene frame (local 18:00), 4088 bright-star catalogue objects and manual view in all captures. This is a synthetic **example point**, not a verified observing site or weather.

The official `simulator_screenshot` tool saved unoptimised 427×920 PNGs:

| Frame | File | SHA-256 |
| --- | --- | --- |
| Formal oblate source | `c05-saturn-oblate-native-2026-09-24.png` | `4C6E569D682DA14D6DC12DFD13C7937223AF0575888CD625C0E7010E9CCC2BB4` |
| Reversible spherical control | `c05-saturn-sphere-control-2026-09-24.png` | `E90DBE56C2ACC063DCFDC75BAA3ACDD0F34FB91988CE1E73480B878109EE6476` |
| Formal source restored and rebuilt | `c05-saturn-oblate-restored-native-2026-09-24.png` | `9C065D5C0DDD0A438B6FF8C8316F3CB687E16A388EE915A513F5B8C639EB8621` |

The control changed only the local GPU phase-disc binding `const shape=disc.oblate;` to `const shape=Math.random()<0 ? disc.oblate : null;` so the shader received the circular fallback while the real report, camera, rings and all other source paths remained the same. `npm run build:weapp -w apps/wechat-miniapp` and `simulator_refresh` loaded that control. After capture, the source was copied back from the pre-edit backup; source SHA-256 returned exactly to `EF39AC81F893F6F8FB71843F23F095247BE497F35F64C4017AC63D756485C585`. A second normal WEAPP build succeeded with the existing three CSS-order/bundle/performance warnings (`c05-saturn-oblate-restored-build-2026-09-24.log`); a second refresh and the same UI/gesture sequence yielded the restored frame. Neither source nor rebuilt `dist/weapp/sky/detail/index.js` contains the temporary marker. The temporary backup is `c05-saturn-oblate-gpu-source-backup-2026-09-24.ts`.

RGB pixel comparison over the sky image (x 0–426, y 100–899) gives 794 exactly changed pixels between formal and circular control, **all inside** the bounded Saturn region x 185–241, y 425–495. With a per-channel threshold greater than 8, 135 pixels differ. Formal before/after restoration differs in **zero sky pixels**, both exact and thresholded. The full screenshot hashes differ because the simulator status-bar clock advanced. Thus the new oblate parameter makes a localized difference in the official native Canvas path and the temporary control is fully reversed. It is still a 1-bar geometric silhouette with an illustrative phase/ring appearance; this does not verify Android/iOS pixels, ring scattering/shadows, measured brightness, weather, frame time or memory.

No Android, ADB, preview QR, cloud publication or shared 8787 restart was used. The normal source build output is restored; the DevTools view was left at the example Saturn frame. C05 and the full Goal remain open for additional surfaces and target devices.
