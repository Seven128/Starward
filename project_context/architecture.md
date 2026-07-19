# Architecture Context

## System Boundary

- This repository owns the Starward product contract, visual design system, and future application implementation for 《今晚去观星》.
- Live weather, astronomy ephemerides, light-pollution data, maps, routing, location, and user-account services are external until concrete providers and interfaces are selected.
- docs/design-system/ contains static Open Design exports and evidence snapshots. They are review/reference assets, not runtime architecture or a competing authority.

## Component Map

- DESIGN.md: authored visual identity, tokens, modes, component styling, and visual rationale.
- project_context/global.md: cross-product goals, user journey, and experience principles.
- project_context/areas/main.md: product-surface ownership, screen/state/interaction contract, and core domain behavior.
- project_context/areas/main/verification.md: repeatable Context and design validation entry points.
- docs/design-system/: generated CSS/JSON tokens, brand overview, source guide, component kits, and their supporting assets.
- Future production code should live in explicit application directories and consume or derive from the canonical design rules rather than editing exported preview files as product UI.

## Data / Control Flow

- The durable user flow is conclusion → place selection → departure/observing window → route and risk → professional evidence → preparation → field use.
- Selected place, time window, route, arrival estimate, and risk are one coordinated state. Changes propagate to every surface that presents those facts.
- Visual mode is orthogonal to task state: planning, night, and red-light modes retain the same current place and workflow position.

## Design Rationale

- Authority is intentionally split by concern: Context defines what the product and surfaces must do; DESIGN.md defines how the visual system should look and feel; exported assets demonstrate or implement that system.
- This prevents generated CSS, JSON, or static kits from silently redefining the product contract.

## Constraints And Tradeoffs

- Mobile-first behavior and outdoor/low-light use make safe-area handling, 44px touch targets, reduced motion, contrast, and low-luminance field behavior architectural UI constraints.
- Forecast and astronomy data are uncertain; provider data must not be presented as guaranteed truth.
- Professional density must use aligned matrices and progressive disclosure without overwhelming the primary decision.

## Verification Implications

- Context integrity is checked through the Tiny Context commands in project_context/areas/main/verification.md.
- DESIGN.md structure is linted separately from exported asset integrity.
- Production UI verification must eventually cover representative mobile viewport, visual mode, key state, and long-content combinations; static kits alone cannot prove product behavior.

## Open Risks

- External data providers, offline/degraded behavior, privacy boundaries for location, routing integration, and production application stack are not yet selected.
