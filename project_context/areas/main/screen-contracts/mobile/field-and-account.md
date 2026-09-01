# Mobile Screen Contracts: Field And Account

This on-demand subdomain node normatively continues the Mobile Screen Contract for its six field, safety, contribution, notification and identity Surfaces.

## `sky-orientation-ar`

- Route / Entry: `/sky`; primary Sky tab, itinerary target, or deep link.
- Primary judgment: where the selected object is now/at the selected time and which orientation mode is trustworthy on this device.
- Regions: immersive sky canvas; top place/time/target/layer context; bottom time/orientation/FOV/AR controls; calibration sheet.
- Fixed / Overlay ownership: sky owns pan/orientation gestures; `sky-time-scrubber` owns time manipulation; `orientation-calibration-sheet` owns its drag/scroll; system edges and accessibility gestures retain priority.
- Material controls in order: `sky-canvas`, `sky-object-and-layer-panel`, `sky-time-scrubber`, `orientation-follow-toggle`, `orientation-calibration-sheet`, `obstruction-and-trajectory-overlay`, `field-of-view-overlay`, `ar-mode-toggle`.
- Commit / Exit: time commits to the shared moment after valid release; sensor/AR denial or low accuracy preserves manual orientation and universal sky; Back exits AR/calibration before route exit.
- Verification emphasis: time-position input variation, sensor/camera boundary invocation, denial/degradation, interruption/velocity seams, manual fallback, reduced motion, and the representative Android runtime required by the current target profile. The same iOS behavior remains an implementation obligation, but live iOS runtime validation is explicitly deferred and unverified.

## `shooting-assistant`

- Route / Entry: `/shooting`; enter from Sky, itinerary, or a saved shooting plan.
- Primary judgment: which conservative settings/checklist fit the selected equipment and conditions.
- Regions: equipment/target setup; preset assumptions; rule recommendation; explanation; checklist; save/version action.
- Fixed / Overlay ownership: form scroll owns content; pickers/sheets own focus while open; save remains reachable without covering fields or errors.
- Material controls in order: `shooting-setup-form`, `shooting-preset-picker`, `shooting-recommendation`, `ai-explanation-panel`, `shooting-checklist`, `save-shooting-plan`.
- Commit / Exit: recommendation is deterministic from versioned input; explanation cannot change the rule result; save writes a new version with context and supports restore.
- Verification emphasis: phone/camera/equipment input variation, assumption and risk copy, offline checklist, durable version save/readback, explanation boundary.

## `field-offline-safety`

- Route / Entry: `/field`; enter from an itinerary or Tonight field action after a readiness check.
- Primary judgment: whether the current offline plan is valid and which low-distraction safety action is next.
- Regions: offline pack/status; field dashboard; mode control; tool grid; parking/backup; safety session; location share; sync queue.
- Fixed / Overlay ownership: return/safety actions remain reachable in the safe area; native/vendor surfaces require pre-warning in red-light mode; no layer may flash to bright white/blue when controllable.
- Material controls in order: `offline-pack-manager`, `field-dashboard`, `night-red-mode-toggle`, `field-tool-grid`, `return-to-parking`, `backup-switcher`, `safety-session-panel`, `location-share-action`, `offline-sync-queue`.
- Commit / Exit: pack activation is atomic after file checksum/version validation; queued writes and share/session state persist; stop/revoke is explicit and idempotent.
- Verification emphasis: flight mode plus app kill/restart, corrupt/partial pack rejection, red-light continuity, return route, bounded share expiry/revoke, queue conflict/replay.

## `community-contribution`

- Route / Entry: `/contribute`; enter from Spot detail or Me → Contributions.
- Primary judgment: what can be safely submitted and what is its current review/expiry state.
- Regions: submission type; guided form; evidence/media privacy review; confirmation; status/appeal.
- Fixed / Overlay ownership: media picker/system permission is pre-warned; privacy review owns the pre-submit gate; status details remain route-owned.
- Material controls in order: `new-spot-wizard`, `field-report-form`, `multidimensional-review-form`, `correction-report`, `media-privacy-review`, `contribution-status-center`.
- Commit / Exit: original media enters a private sink; only a sanitized derivative can advance; submissions use idempotent revision/status transitions and preserve drafts/errors.
- Verification emphasis: EXIF-bearing input, private original/derived hashes, moderation and restart readback, transient expiry, permission denial, retry without duplicate publication.

## `notifications-and-toolbox`

- Route / Entry: `/toolbox`; enter from Me or a notification deep link.
- Primary judgment: which alert/tool is enabled, what it will do, and what limitation applies.
- Regions: notification rules/settings; deep-link message context; tool index; event detail; calculators.
- Fixed / Overlay ownership: rule/picker layers restore focus; OS notification permission/scheduling is point-of-use and its result returns to the owning rule.
- Material controls in order: `notification-rule-editor`, `notification-settings-center`, `notification-message-deeplink`, `toolbox-index`, `celestial-event-detail`, `astronomy-calculator-form`.
- Commit / Exit: local schedule/change/cancel uses durable notification IDs; remote channel remains explicitly unavailable unless its adapter succeeds; deep links preserve message and destination context.
- Verification emphasis: real native local scheduling, modify/cancel, denied permission Inbox, timezone/calendar semantics, calculator variation and precision/source limitations.

## `identity-profile-privacy`

- Route / Entry: `/me` and account/privacy subroutes; primary Me tab and auth-gated actions.
- Primary judgment: what identity/data/device state exists and which guarded action is safe to take.
- Regions: auth gate; guest merge; profile/content/equipment; sessions; privacy; export/delete; help/sources.
- Fixed / Overlay ownership: auth/merge/export/delete use focused guarded sheets/flows; destructive confirmation restores focus and never traps the user.
- Material controls in order: `auth-gate-sheet`, `guest-data-merge`, `profile-hub`, `content-library-browser`, `equipment-manager`, `session-security`, `privacy-center`, `export-delete-flow`, `help-and-source-center`.
- Commit / Exit: basic query remains guest-capable; owner session secrets use platform secure storage; merge/export/delete have preview, operation identity, audit, retry and restart readback.
- Verification emphasis: unauthorized rejection, secure-storage boundary, merge conflict, session revoke, real export artifact/expiry, auditable deletion and retained exceptions.
