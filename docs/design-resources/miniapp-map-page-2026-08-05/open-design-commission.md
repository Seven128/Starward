# Open Design Commission — 微信小程序地图页

Read and obey the project-bound design system `user:soft-instruments` before creating any visual output. Its `DESIGN.md` is the exact style source. Do not use the native Starward App system, generic desktop UI-kit files, legacy targets, reference-page layouts, or remembered Open Design templates.

The full task-local source inventory and requirements are in `source-index.md`. Treat that file as product/technical commission context, not as a second design system.

## Deliverable

Create one self-contained, responsive, interactive high-fidelity review artifact at `index.html` for the WeChat Mini Program map page of 《今晚去观星》.

The artifact must:

1. Be directly previewable with no build step, no external network dependency, no remote font, no map tile, and no copied photograph. Use inline HTML/CSS/JavaScript/SVG or local project files only.
2. Make the primary `750rpx` Mini Program geometry inspectable at a phone viewport while reflowing at approximately 320–430 CSS px wide and respecting top capsule/safe-area plus bottom safe-area.
3. Show a clearly labelled `演示区域 · 示例数据` visual simulation, not a real map or realtime service.
4. Cover the map page itself: search, filter chips, native-map simulation, marker/cluster grammar, floating locate/layer controls, selected spot compact card/sheet, route summary/degradation, and the proposed `夜空—地图—我的` global navigation context with the center Map destination visually dominant.
5. Provide visible review controls for day, night, observation red, and reduced motion. All modes preserve the same map/selection/filter state.
6. Provide a compact scenario switcher or inspectable state controls for at least:
   - default ready map;
   - selected spot/card;
   - search overlay with grouped results plus no-results;
   - filter sheet;
   - light-pollution layer and its legend/source/date/estimate label;
   - permission denied with manual city path;
   - stale/partial/offline data;
   - route unavailable with explicitly labelled straight-line fallback;
   - layer unavailable;
   - sensitive approximate coordinate or spot-closed state;
   - loading/empty/error.
7. Keep marker, card and route selection synchronized. Returning-from-detail restoration may be demonstrated through an annotation or local interaction without designing the detail page.
8. Use only Tier-A functional icon grammar for map/search/filter/layer/location/navigation. Do not add decorative Tier-B 3D objects to this page.
9. Use a labelled `实景待补` or `示例` place-media treatment. Do not imply a synthetic image is an actual spot.
10. Use calm Chinese copy, explicit uncertainty/source/update time, non-color-only status, stable geometry, `88rpx` minimum hit regions, enlarged-text resilience, and the exact Mini Program mode/token contracts.
11. Keep the observation condition closed to the adopted black/warm-red palette for every controlled surface, icon, status, loading/error state, map overlay and authored media. Do not apply a whole-screen filter.
12. Include an in-artifact `设计说明` panel or equivalent compact inspection notes naming the page hierarchy, state meanings, interaction invariants, sample-data disclaimer, route/vendor handoff boundary, and which behavior still requires WeChat/real-device validation.

## Product fidelity boundary

- Map is the proposed default entry for this candidate, but the artifact is not an adopted Product Surface.
- Location is requested at point of use. Without permission, show a usable default region and a manual city/search path.
- Search groups registered spots, ordinary places, and history. Ordinary places can offer `查看此处夜空` but do not become formal spots.
- Markers distinguish cluster/spot, selected, favorite, closed/abnormal, insufficient data and approximate/restricted location without relying on color alone.
- The selected spot card shows name, estimated light-pollution posture, tonight state, distance/drive estimate, three-to-five facility summaries, freshness and `查看详情`.
- Route failure must not draw a fake route. Use `非路线距离` and `路线待刷新` or a valid cached-route label.
- Layer UI shows legend, source class, data date/update and estimate/precision language.
- Missing is not zero; stale/partial/offline states keep usable facts and name limitations.
- Do not design turn-by-turn navigation, spot detail, Night page, My page, comments, payment, multi-point planning or full App parity.

## Resource economy

Do not create a separate low-fi flow, separate component board, Figma copy, decorative 3D asset pack, or formal handoff manifest. One comprehensive interactive artifact plus a short `README.md` identifying the entry and review controls is sufficient for this unselected review candidate.

Before finishing, open or otherwise sanity-check the artifact, correct obvious overflow/corruption/console issues, and report the exact entry file and any limitations honestly.
