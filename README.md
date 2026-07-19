# Starward

Starward is the repository for the mobile stargazing decision product 《今晚去观星》. The product helps a user decide whether to leave tonight, choose a location and departure time, understand the best observing window, plan the route, and prepare for on-site observation or photography.

## Project authority

- DESIGN.md is the canonical visual-system source: identity, tokens, component styling, visual modes, motion, and visual do/don't rules.
- project_context/global.md describes the product goal, user journey, and durable cross-screen experience.
- project_context/areas/main.md owns screen responsibilities, interaction states, and the progressive-disclosure contract.
- docs/design-system/ contains imported Open Design previews and machine-consumable exports. These are implementation/reference artifacts, not a second source of truth.

## Tiny Context

This repository uses project-tiny-context-harness. It was initialized as a fresh project with ty-context init.

Run:

    npm run context:sync
    npm run context:validate
    npm run context:doctor

## Design references

- docs/design-system/brand.html — brand-system overview
- docs/design-system/system/kit.html — light component kit
- docs/design-system/system/kit.dark.html — dark component kit
- docs/design-system/system/variables.css — generated CSS variables
- docs/design-system/system/theme.json — generated theme seed
- docs/design-system/guide.md — source brand and product-experience guide
