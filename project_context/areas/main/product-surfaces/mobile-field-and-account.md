# Product Surfaces: Mobile Field And Account

This on-demand contract node continues the mobile field, safety, contribution, notification and identity responsibility portion of `product-surface-contract.md`.

## Mobile Product Surfaces

### `sky-orientation-ar`

- Surface: `/sky`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: At the selected place and time, where is the target and what can I use when sensors or AR are unavailable?
- Main Surface Allows: immersive sky, object/layer controls, continuous time scrub, orientation follow/manual calibration, obstruction/trajectory, equipment field of view, optional AR.
- Main Surface Forbids: AR as the only core path, hidden sensor accuracy, fabricated orientation, or gesture-only essential actions.
- Drilldown Ownership: equipment edits belong to profile; photography decisions belong to `/shooting`; provenance belongs to forecast/spot evidence.
- Long Task State Requirement: time/orientation manipulation is interruptible and reversible; capability denial/failure keeps a manual degraded path and the same shared context revision.

### `shooting-assistant`

- Surface: `/shooting`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Given my equipment, target, place, and conditions, what conservative settings and preparation should I try?
- Main Surface Allows: setup, presets with assumptions, deterministic recommendation, optional explanation, checklist, versioned save.
- Main Surface Forbids: AI-invented exposure facts, guaranteed results, hidden assumptions, or saving a plan without its context/version.
- Drilldown Ownership: source evidence remains in forecast/spot; equipment inventory remains in profile.
- Long Task State Requirement: recommendation and save preserve inputs, distinguish rule result from explanation, and recover the saved version after restart.

### `field-offline-safety`

- Surface: `/field`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I execute the trip safely in low light and without reliable connectivity?
- Main Surface Allows: verified offline pack, concise dashboard, night/red-light modes, field tools, return-to-parking, backup switch, bounded safety session, explicit location share, sync queue.
- Main Surface Forbids: online-only critical actions, bright/blue surprise surfaces, implicit continuous sharing, or treating an unverified manifest as an offline pack.
- Drilldown Ownership: detailed evidence remains available but does not displace safety, return, time, and current-plan actions.
- Long Task State Requirement: downloads, activation, queued writes, safety session and share/revoke expose progress, checksum/version, expiry, idempotency, conflict and restart recovery.

### `community-contribution`

- Surface: `/contribute`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How can I contribute a place, field report, review, correction, or media without leaking sensitive data?
- Main Surface Allows: guided submission, validation, privacy review, transient-report expiry, multidimensional review, correction evidence and visible moderation status.
- Main Surface Forbids: raw EXIF/precise private location in ordinary views, instant-public claims, or a general social network.
- Drilldown Ownership: moderation detail and appeals are bounded; owner moderation actions live only in operations.
- Long Task State Requirement: upload/submission state, sanitized derivative, review revision, errors and retry survive restart without duplicating the original write.

### `notifications-and-toolbox`

- Surface: `/toolbox`.
- Surface Platform: iOS and Android React Native.
- Primary User Question: Which bounded alerts and astronomy tools should help me prepare or respond without becoming noise?
- Main Surface Allows: rule editor, consent/settings, deep-link result, tool index, event detail and labelled calculators.
- Main Surface Forbids: notification without consent, silent timezone changes, unexplained precision, or remote-channel success when only local scheduling exists.
- Drilldown Ownership: detailed event/source limitations stay with the tool/event; destination screens own the action after a deep link.
- Long Task State Requirement: schedule/change/cancel and denial paths have durable identifiers, visible inbox/history and restart readback.

### `identity-profile-privacy`

- Surface: `/me` and account/privacy subflows.
- Surface Platform: iOS and Android React Native.
- Primary User Question: How do I control identity, local/cloud data, devices, content, equipment, sessions, export, deletion, and help?
- Main Surface Allows: explicit auth gate, guest merge preview, profile/content/equipment, session security, privacy controls, real export/delete status, sources/help.
- Main Surface Forbids: mandatory login for basic query, secrets or raw sensitive fields, deletion-success before completion, or unreviewed guest/cloud overwrite.
- Drilldown Ownership: high-impact merge/export/delete/session actions use focused guarded flows; ordinary profile remains concise.
- Long Task State Requirement: auth/session/export/delete operations expose operation identity, progress, idempotency, expiry, retry, audit and restart recovery.
