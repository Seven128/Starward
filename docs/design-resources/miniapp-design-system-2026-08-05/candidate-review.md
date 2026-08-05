# Mini Program design-system candidate review

Status: selected by the owner and adopted as the independent WeChat Mini Program Design Authority profile on 2026-08-05.

## Scope boundary

- The selection candidate is [`candidate-design-brief.md`](./candidate-design-brief.md), backed by the immutable reference and research ledger in [`source-index.md`](./source-index.md).
- The existing Starward App design system, tokens, components, screen targets, layout values, and React Native interaction constants are excluded as source material. Reading those authorities was boundary discovery only.
- The eight user-provided images are `inspiration`, not `exact-target` or `constraint` resources. They do not authorize copying poster layouts, sample data, phone frames, logos, branded photography, or a full App navigation model.
- The repository does not yet define a Mini Program Product Surface, runtime, framework, workspace, or screen ownership. This candidate therefore defines a platform-scoped visual/interaction grammar without inventing product information architecture.

Selection locator: `docs/design-resources/miniapp-design-system-2026-08-05/candidate-design-brief.md`
Candidate SHA-256: `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`
Source-index SHA-256: `80cb69b9501b556ca8c186c770e5257ee5136e031e52ce54c42d7298eba3e3f7`

## Open Design run

| Item | Result |
| --- | --- |
| Provider | Open Design daemon `0.16.1` |
| Candidate id | `user:soft-instruments` |
| Generation job | `10ec571c-98e1-4ac9-a5c0-952c0b8377d9` — succeeded |
| Provider state | `published`; body synchronized byte-for-byte with the selected candidate; project `ds-soft-instruments` bound to `user:soft-instruments` |
| Generated entries | 38 files/folders, including a retrievable `DESIGN.md`, previews, showcase, token stylesheet, and UI-kit scaffold |
| Token-contract rebuild | unavailable: provider reported no token-contract quality report |
| Focused revision job | `08bb6147-6aa2-4025-9716-26b54d873d92` — execution succeeded |
| Revision | `01e159b2-6529-4f8b-8916-67a65576a3e1` — rejected after review |

The Open Design run makes the selected source editable and retrievable through the live structured provider. Selection itself came only from the owner's explicit instruction “采用此候选”; adoption and exact-value authority live in root `DESIGN.md`, not in provider state.

### Provider-generated material rejected from the candidate

Visual and structural readback found that Open Design's automatically scaffolded secondary artifacts did not follow the Mini Program brief:

- the showcase is a generic English SaaS marketing/dashboard page with pricing, customers, sales metrics, and desktop navigation;
- the UI kit is an unrelated assistants/chat desktop layout;
- the generated CSS invents colors, uses Inter/Georgia, substitutes generic pixel scales, and omits the three role-isomorphic modes and the observation-red system;
- the generated logo and generic assets are ungrounded;
- the focused revision merely appended the correction request to the body and did not rebuild those secondary artifacts.

Those files are excluded from selection, token authority, implementation handoff, and adoption. The reviewed repository brief is the only candidate being offered for selection.

## Candidate quality corrections

The first palette draft exposed four normal-text contrast failures. The reviewed candidate corrected them before selection. The current verifier checks 51 text, action, focus, and status pairs across all four controllable surfaces in each mode:

| Mode | Checked pairs | Lowest checked pair | Ratio / requirement |
| --- | ---: | --- | ---: |
| Day | 17 | `warning/surface` graphical reinforcement | `4.11:1 / 3:1` |
| Night | 17 | `text-tertiary/surface-elevated` | `4.70:1 / 4.5:1` |
| Observation | 17 | `text-tertiary/surface-elevated` | `4.59:1 / 4.5:1` |

The lowest day normal-text pair is `text-tertiary/surface-subtle` at `4.56:1`. The day `on-primary/primary` pair is `5.27:1`; night is `7.66:1`; observation is `6.53:1`.

The observation palette was also repaired to expose the same semantic roles as day and night. Hue-dependent status meaning remains forbidden: icon, label, shape, border, and position carry state semantics.

## Adoption result

The owner selected this exact candidate on 2026-08-05 with “采用此候选”. Root `DESIGN.md` now owns `target.system.wechat-miniapp-soft-instruments-2026-08-05` and records the candidate/source digests, interpretation, conditions, provider provenance and editable-upstream route.

The adoption does not replace or derive from the existing App target. It establishes one Mini Program exact-value source in `DESIGN.md` and one future generation direction into a framework adapter. Mini Program Product Surface, Screen Contract, framework, workspace, routes, runtime behavior and acceptance journeys remain intentionally undecided; none may be inferred from this visual-system adoption.
