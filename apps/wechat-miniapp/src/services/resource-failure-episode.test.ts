import assert from 'node:assert/strict';
import test from 'node:test';
import { createResourceFailureEpisode } from './resource-failure-episode';

test('refresh, transient absence and hiding preserve one failure episode until positive recovery', () => {
  const episode = createResourceFailureEpisode();
  const current = { scope: 'resource:a', active: true, pending: false, failed: true, healthy: false };
  assert.equal(episode.observe(current), true);
  assert.equal(episode.observe(current), false);
  assert.equal(episode.observe({ ...current, pending: true }), false);
  assert.equal(episode.observe({ ...current, active: false, failed: false, healthy: true }), false);
  assert.equal(episode.observe({ ...current, failed: false }), false, 'absence is not health');
  assert.equal(episode.observe(current), false);
  assert.equal(episode.observe({ ...current, failed: false, healthy: true }), false);
  assert.equal(episode.observe(current), true, 'a failure after actual recovery is a new episode');
});

test('explicit retry can report its failure again; automatic loading cannot', () => {
  const episode = createResourceFailureEpisode();
  const current = { scope: 'resource:a', active: true, pending: false, failed: true, healthy: false };
  assert.equal(episode.observe(current), true);
  episode.observe({ ...current, pending: true });
  assert.equal(episode.observe(current), false);
  episode.retry();
  assert.equal(episode.observe({ ...current, pending: true }), false);
  assert.equal(episode.observe(current), true);
  assert.equal(episode.observe(current), false);
});

test('scope replacement starts a new owner while hidden scope changes do not revive a current failure', () => {
  const episode = createResourceFailureEpisode();
  const current = { scope: 'resource:a', active: true, pending: false, failed: true, healthy: false };
  assert.equal(episode.observe(current), true);
  episode.observe({ ...current, scope: 'hidden:temporary', active: false, healthy: true });
  assert.equal(episode.observe(current), false);
  assert.equal(episode.observe({ ...current, scope: 'resource:b' }), true);
  assert.equal(episode.observe({ ...current, scope: 'resource:b' }), false);
});
