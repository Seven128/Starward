# Restore and release gates

Starward treats PostgreSQL, versioned objects and immutable raw inputs as truth; Redis and device caches are disposable. A restore drill records target time, latest durable point, start/end, database/object/reference/permission verification, failed items and evidence links. Internal production readiness requires measured core RPO ≤15 minutes and RTO ≤2 hours.

OTA promotion is allowed only when native modules and `runtimeVersion` are unchanged and schema rollback remains compatible. Any native capability change requires new iOS and Android binaries, a new runtime compatibility record and the native capability gates. External legal, store, provider, domain-review and outdoor confirmations remain separate blockers and cannot be inferred from CI or emulator output.

The current machine-delivery deferrals, evidence surfaces and owner reminders are maintained in [current-delivery-deferred-gates.md](../evidence/current-delivery-deferred-gates.md). A truthfully deferred gate may allow machine delivery to be evaluated while `releaseBlocked` remains true; it never authorizes production promotion.
