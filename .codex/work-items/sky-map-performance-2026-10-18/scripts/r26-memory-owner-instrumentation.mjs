// Finite template additions, not a fork of the r25 transport/lifetime owner.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('r26_memory_owner_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addR26MemoryOwnerLinks(adapter) {
  adapter = 'import { createR26MemoryOwnerLinks } from "./r26-memory-owner-links";\n' + adapter;
  adapter = one(adapter, 'const owners = createR25StellarOwnerObserver();',
    'const owners = createR25StellarOwnerObserver();\nconst ownerLinks = createR26MemoryOwnerLinks(value => owners.aggregateId(value));', 'weak_identity_only');
  adapter = one(adapter, 'function stopTracking() { tracking = false; owners.stopTracking(); }',
    'function stopTracking() { tracking = false; owners.stopTracking(); ownerLinks.stopTracking(); }', 'same_pause');
  adapter = one(adapter, 'export function r25MemoryStatus()',
    'export function r26AggregateUse(kind: Parameters<typeof ownerLinks.use>[0], value: unknown) { ownerLinks.use(kind, value); }\n' +
    'export function r26AggregateSlot(slot: Parameters<typeof ownerLinks.slot>[0], value: unknown) { ownerLinks.slot(slot, value); }\n' +
    'export function r25MemoryStatus()', 'scalar_use_hooks');
  adapter = one(adapter, 'schemaVersion: "starward-r25-memory-checkpoint-v1"',
    'schemaVersion: "starward-r26-memory-checkpoint-v1"', 'separate_extended_schema');
  adapter = one(adapter, 'function queueLatest() {', 'function queueLatest(phase: Phase = "baseline") {', 'phase_from_actual_checkpoint');
  adapter = one(adapter, 'function checkpoint(phase: Phase) { if (probe.checkpoint(phase)) queueLatest(); }',
    'function checkpoint(phase: Phase) { if (probe.checkpoint(phase)) queueLatest(phase); }', 'same_checkpoint_phase');
  adapter = one(adapter, 'observation, owners: owners.snapshot() });',
    'observation, owners: owners.snapshot(), ownerLinks: ownerLinks.snapshot(phase, observation.clock.elapsedMs) });', 'bounded_owner_packet');
  adapter = one(adapter, 'owners.start(); tracking =', 'owners.start(); ownerLinks.start(); tracking =', 'same_start');
  adapter = adapter.replaceAll('owners.release();', 'owners.release(); ownerLinks.release();');
  return adapter;
}
