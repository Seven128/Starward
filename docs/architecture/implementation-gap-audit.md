# Starward implementation gap audit

Last audited: 2026-07-20  
Source authority: `docs/source-plan.md`  
Delivery authority: `tmp/ty-context/long-task-runs/starward-complete-react-native-app/delivery-contract.yaml`

## Purpose

This audit records what the repository actually implements. Passing a frozen UI evidence case proves that a declared interaction is observable; it does not by itself prove provider integration, persistence, native behavior, background execution, or production readiness. A screen backed only by scenario configuration remains incomplete even if its controls and evidence labels pass browser checks.

## Current implementation truth

| Outcome | Implemented production behavior | Material remaining work |
| --- | --- | --- |
| Mobile shell and preferences | Expo 57 / RN 0.86 shell, five destinations, persisted Zustand preferences, explicit permission fallbacks, global data-state presenter | Complete onboarding field coverage, SQLite data layer, localization, native development-build verification, real destination navigation state |
| Tonight decision | Typed NightReport request/response, server aggregation service, normalized-weather evidence port, hard safety ordering, continuous windows, partial route degradation, immutable/idempotent snapshots, PostgreSQL repository, HTTP handler/client, provenance-aware screen | Wire contracted provider transports and API host, candidate geospatial query, cache/job orchestration, authenticated profile lookup, production database execution and replay load tests |
| Forecast and astronomy | QWeather/Open-Meteo normalizers, provider production hard gate, null-preserving SI-unit schema, attribution/warning-source chain, fixed Astronomy Engine wrapper for astronomical dusk/dawn, moon and supported target tracks, atmosphere uncertainty boundary, professional fixture UI | Contracted weather credentials/transports, target-region POC and ingestion worker, approved weather/astronomy scoring policies, JPL multi-site golden validation, satellite OMM/SGP4 pipeline, fifteen-day storage and map layers |
| Map and route discovery | Iterative WGS84/GCJ-02 adapter with measured round trip, bounded/cursor PostGIS spot search, route adapter/service with attributable cache and honest straight-line degradation, spatial migrations, interactive evidence surface | Contracted AMap native view/transport, map camera and marker state, route cache execution/jobs, complete filters/layers and route editor |
| Spot detail and trust | Server-enforced six-level coordinate disclosure across share/navigation/offline/itinerary, provenance-bearing fact/conflict resolver, conservative safety action gate, normalized spot/fact/status/horizon/verification persistence, interactive evidence surface | Detail HTTP endpoint/client, media/EXIF pipeline, light-pollution derivation, multidimensional review persistence, merge and actual field-verification workflows |
| Itinerary and collaboration | Interactive evidence surface | Versioned itinerary domain/API, route/timeline consistency, SQLite offline drafts, secure shares, WebSocket collaboration and conflict resolution |
| Sky orientation and AR | Capability fallback function and interactive evidence surface | Astronomy rendering state, Skia/GPU sky, sensor fusion/calibration, FOV model, obstruction profile, optional ARKit/ARCore native adapters |
| Shooting assistant | Deterministic exposure boundary and interactive evidence surface | Device/lens catalog, versioned exposure/stacking/trailing rules, plan persistence, offline checklist, device/expert calibration evidence |
| Field offline safety | Offline restore/queue dedup functions and interactive evidence surface | Versioned offline-pack builder/download/checksum, SQLite replay journal, red-light runtime theme, bounded safety session, foreground/background lifecycle and native field tests |
| Community contribution | Interactive evidence surface | Contribution API/storage, coordinate privacy transform, EXIF/media sanitization, moderation/trust state machine, expiry jobs, safety-correction escalation |
| Notifications and toolbox | Affected-grid batch evaluation, event dedup and population accounting | Subscription/rule persistence, cooldown engine, push-channel adapters, delivery receipts, deep links, calendar/position tools and consent-aware educational content |
| Identity, profile and privacy | Guest merge planning, privacy transforms, session/security policies and interactive evidence surface | Authentication/OAuth/OTP adapters, secure token persistence, account/session API host, export jobs, deletion/retention execution and audit storage |
| Admin and data operations | Data envelope/cache/replay functions, entity tracing and interactive evidence surface | Runnable Next.js console, protected admin API, source/job/spot/moderation/replay persistence, role/MFA integration, operational telemetry |
| Quality, release and observability | Platform/security boundaries, interaction runtime rules, environment references, pending evidence manifests and browser quality surface | CI build/release pipelines, telemetry backend, restore drills, production-like SLO measurement, complete native/device/field matrix and external compliance confirmations |

## Verified today

- Mobile TypeScript compilation passes.
- Automated unit/integration suites contain 31 passing tests: four mobile tests and twenty-seven API/domain tests, including NightReport/HTTP, weather gate/normalization, API host, astronomy, coordinate/spatial route and spot trust policy coverage.
- Tonight browser acceptance contains four passing production-route cases at 390 × 844.
- The previous clean candidate `dd4629e` reached Live Final Gate and returned `needs_work` with exactly three machine findings: production SLO evidence, complete native/field test coverage, and China production compliance confirmation.

## Implementation order

1. Finish the core decision loop: real provider-normalized weather/astronomy/spot/route ports, API host, cache, PostgreSQL and mobile query wiring.
2. Build map/spot/route as one shared selected-place and decision-context state, including native AMap POC behind an adapter.
3. Build itinerary plus offline field persistence/replay so the user can execute a plan without network.
4. Add identity-protected writes, community moderation and notification subscriptions/workers.
5. Add sky/sensor/AR and shooting professional layers without making them core blockers.
6. Complete admin operations, observability, release automation and external production gates.

No row may be promoted to complete from screenshots, fixture-only browser behavior, generated evidence labels, or a verifier that does not execute the named production boundary.
