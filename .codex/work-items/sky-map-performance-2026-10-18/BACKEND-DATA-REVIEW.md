# Backend data independent review

User explicitly authorized a fresh read-only reviewer on2026-10-18. `backend_data_readonly_review` reviewed implementation95aeb066 and the affected static-light consumer3b0d8916, without modifying files, operating devices/services or rerunning the full suite. It independently checked all1,544 public files /234,624,578B against the locked index and publication bindings. It found no confirmed P1 and one P2, then completed and was closed; its verdict is not extended to future code automatically.

## Confirmed P2 and repair

The new Compose recovery path selected a named project for pg_restore, while SQL still used the infrastructure owner's hard-coded default55432. A second machine could start an isolated project on55433 and have SQL create/check a database in a different pre-existing instance. The default-port restoration already completed here was not affected.

The repair is at the shared `infrastructure-runtime.mjs` owner: validate and capture Compose PostgreSQL/Redis ports plus project identity, derive SQL URLs from that same selection, and pass captured settings to startup and native dump/restore. The backup/restore owner checks the running container's actual loopback port mapping before SQL effects, rather than trusting only desired configuration. Handoff config now forwards these optional ports; `verify-db` uses the same preflight. A malformed private config produces a generic error without echoing its contents.

The new regression failed before the repair with55432 versus expected55433. All five scoped infrastructure-runtime checks then passed, covering consistent endpoints, later environment drift and live-mapping mismatch. A fresh owned PostgreSQL17/Redis project was actually started on55433/56380 while the original restored instance stayed on55432/56379. The full original dump restored and all73 row sets/hashes matched; distinct cluster identities and target-database presence proved that only the selected instance received it. RESTORE-PORT-CHECK.json owns the receipt. Only the two newly created port-check volumes/containers/network were removed afterward. The original restored database, API8794, phone services and unrelated Docker projects remain.

This is an addressed review finding with a before/after regression and real isolated recovery; no second independent review was claimed. Product CI results belong to BACKEND-DATA-DELIVERY/REMOTE-CI-CHECKPOINT. Phone rendering, remaining native gestures/shares, raw EOG upload and unattended Drive authentication remain outside this code-review pass.
