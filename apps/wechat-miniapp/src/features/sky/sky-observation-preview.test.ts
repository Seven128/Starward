import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkyObservationTime, skyContinuousTimeCoverage, skyObservationFrameAt,
  skyObservationFrameCurrent, skyObservationFrameReadable, SKY_TIME_PREVIEW_SETTLE_MS } from './sky-observation-time';

const start = '2026-09-29T13:00:00.000Z', end = '2026-09-29T13:30:00.000Z';
const make = () => {
  const time = createSkyObservationTime(); time.bind('context:1', start, { startAt: start, endAt: end }); return time;
};

test('a step preserves its exact target while forward and reverse presentation samples settle independently', () => {
  for (const [from, target] of [[start, end], [end, start]] as const) {
    const time = make(); time.preview(from);
    const moving = time.preview(target, { fromAt: from, elapsedAt: 1000 });
    const generation = moving.presentationGeneration;
    assert.equal(moving.at, target); assert.equal(moving.previewAt, from); assert.equal(moving.previewMotion, 'moving');
    const mid = time.tick(1000 + SKY_TIME_PREVIEW_SETTLE_MS / 2);
    assert.equal(mid.at, target);
    assert(Date.parse(skyObservationFrameAt(mid)) > Date.parse(start) && Date.parse(skyObservationFrameAt(mid)) < Date.parse(end));
    assert(skyObservationFrameCurrent(mid, skyObservationFrameAt(mid), generation));
    assert.equal(skyObservationFrameCurrent(mid, target, generation), false, 'the unsampled destination is not an intermediate frame');
    assert.equal(skyObservationFrameCurrent(mid, skyObservationFrameAt(mid), generation - 1), false);
    assert.equal(time.tick(1000), mid, 'a backwards scheduling clock cannot reverse the trajectory');
    const settled = time.tick(1000 + SKY_TIME_PREVIEW_SETTLE_MS);
    assert.equal(settled.previewAt, null); assert.equal(settled.previewMotion, null); assert.equal(settled.at, target);
    assert(skyObservationFrameCurrent(settled, target, generation, skyObservationFrameAt(mid)));
    assert.equal(skyObservationFrameCurrent(settled, skyObservationFrameAt(mid), generation, target), false,
      'an old intermediate cannot overwrite a completed destination');
    assert.equal(time.tick(100_000), settled, 'settled previews do not create persistent playback');
  }
});

test('a replacement starts at the actual accepted instant and an equal-time ABA retires old frames', () => {
  const time = make(), first = time.preview(end, { fromAt: start, elapsedAt: 0 });
  const middle = time.tick(SKY_TIME_PREVIEW_SETTLE_MS / 2), acceptedAt = '2026-09-29T13:05:00.000Z';
  assert(Date.parse(acceptedAt) < Date.parse(skyObservationFrameAt(middle)));
  const replacement = time.preview(start, { fromAt: acceptedAt, elapsedAt: 90 });
  assert.equal(replacement.previewAt, acceptedAt, 'do not start at an unpainted requested sample');
  assert.equal(replacement.at, start);
  assert.equal(skyObservationFrameCurrent(replacement, start, first.presentationGeneration), false);
  const again = time.preview(end, { fromAt: acceptedAt, elapsedAt: 100 });
  assert.equal(again.at, first.at); assert.notEqual(again.presentationGeneration, first.presentationGeneration);
  assert.equal(skyObservationFrameCurrent(again, end, first.presentationGeneration), false);
});

test('waiting for a connected geometry window does not consume the motion clock or extrapolate a gap', () => {
  const time = make(), from = '2026-09-29T13:25:00.000Z', target = '2026-09-29T13:35:00.000Z';
  const a = { startAt: start, endAt: end }, b = { startAt: end, endAt: '2026-09-29T14:00:00.000Z' };
  time.preview(from);
  const waiting = time.preview(target, { fromAt: from, elapsedAt: 0 });
  assert.equal(waiting.previewMotion, 'waiting'); assert.equal(time.tick(10_000), waiting);
  const moving = time.bind('context:1', start, b, { coverage: skyContinuousTimeCoverage(b, a), elapsedAt: 10_000 });
  assert.equal(moving.previewMotion, 'moving'); assert.equal(moving.previewAt, from);
  const middle = time.tick(10_000 + SKY_TIME_PREVIEW_SETTLE_MS / 2);
  assert(Date.parse(skyObservationFrameAt(middle)) > Date.parse(end));
  time.bind('context:1', start, b, { coverage: b, elapsedAt: 10_100 });
  assert.equal(time.snapshot().presentationGeneration, moving.presentationGeneration, 'the earlier model can retire after its segment');
  time.tick(10_000 + SKY_TIME_PREVIEW_SETTLE_MS); assert.equal(time.snapshot().at, target);
  const distant = '2027-09-29T13:35:00.000Z', c = { startAt: '2027-09-29T13:00:00.000Z', endAt: '2027-09-29T14:00:00.000Z' };
  time.preview(distant, { fromAt: target, elapsedAt: 11_000 });
  time.bind('context:1', start, c, { coverage: skyContinuousTimeCoverage(c, b), elapsedAt: 12_000 });
  assert.equal(time.snapshot().at, distant, 'missing intermediate supply cannot restrict selectable time');
  assert.equal(time.snapshot().previewAt, null); assert.equal(time.snapshot().previewMotion, null);
});

test('reduced motion, cancellation, hide, Context replacement and withdrawn supply retire pending samples', () => {
  const reduced = make().preview(end, { fromAt: start, elapsedAt: 0, reducedMotion: true });
  assert.equal(reduced.at, end); assert.equal(reduced.previewAt, null);
  for (const retire of [
    (time: ReturnType<typeof make>) => time.pause(), (time: ReturnType<typeof make>) => time.hide(10),
    (time: ReturnType<typeof make>) => time.cancel(), (time: ReturnType<typeof make>) => time.bind('context:2', start, null),
    (time: ReturnType<typeof make>) => time.bind('context:1', start, null), (time: ReturnType<typeof make>) => time.requestPlay(),
  ]) {
    const time = make(), moving = time.preview('2026-09-29T13:10:00.000Z', { fromAt: start, elapsedAt: 0 });
    retire(time); const retired = time.snapshot();
    assert.equal(retired.previewAt, null); assert.equal(retired.previewMotion, null);
    assert.notEqual(retired.presentationGeneration, moving.presentationGeneration);
    assert.equal(skyObservationFrameCurrent(retired, retired.at, moving.presentationGeneration), false);
    assert.equal(time.tick(1_000), retired);
  }
});

test('invalid motion origins and disconnected windows never manufacture intermediate supply', () => {
  const time = make();
  assert.equal(time.preview(end, { fromAt: 'invalid', elapsedAt: 0 }).previewAt, null);
  assert.equal(skyContinuousTimeCoverage(null, { startAt: start, endAt: end }), null);
  assert.deepEqual(skyContinuousTimeCoverage({ startAt: start, endAt: end }, { startAt: 'invalid', endAt: end }),
    { startAt: start, endAt: end });
  const bounded = createSkyObservationTime({ latestInstant: () => Date.parse(end) });
  bounded.bind('context:1', start, { startAt: start, endAt: end });
  const selected = bounded.preview('2026-09-29T14:00:00.000Z', { fromAt: start, elapsedAt: 0 });
  assert.equal(selected.at, end); bounded.tick(SKY_TIME_PREVIEW_SETTLE_MS);
  assert.equal(skyObservationFrameAt(bounded.snapshot()), end);
});

test('reading the currently copied origin never grants an old frame permission to write into a new intent', () => {
  for (const play of [false, true]) {
    const time = make(), origin = time.snapshot();
    const next = play ? time.play(0) : time.preview(end, { fromAt: start, elapsedAt: 0 });
    assert(skyObservationFrameReadable(next, start, origin.presentationGeneration));
    assert.equal(skyObservationFrameCurrent(next, start, origin.presentationGeneration), false);
    assert.equal(skyObservationFrameReadable(next, '2026-09-29T12:59:00.000Z', origin.presentationGeneration), false);
    assert.equal(skyObservationFrameReadable(next, start, -1), false);
    assert.equal(skyObservationFrameReadable(next, start, next.presentationGeneration + 1), false);
    time.cancel();
    assert.equal(skyObservationFrameReadable(time.snapshot(), start, origin.presentationGeneration), false,
      'an equal-time cancelled intent cannot reuse an earlier generation');
  }
});

test('held fields retain the actual origin when reduced motion or missing motion skips interpolation', () => {
  for (const reduced of [false, true]) for (const direction of [-1, 1]) {
    const time = make();
    const origin = direction > 0 ? start : end;
    time.preview(origin); time.edit('fields', true);
    const at = (step: number) => new Date(Date.parse(origin) + direction * step * 60_000).toISOString();
    const motion = (fromAt: string) => reduced ? { fromAt, elapsedAt: 0, reducedMotion: true } : undefined;
    time.preview(at(1), motion(origin));
    const pending = time.preview(at(2), motion(at(1)));
    time.preview(at(3), motion(at(1)));
    const latest = time.preview(at(4), motion(at(1)));
    assert.equal(latest.presentationGeneration, pending.presentationGeneration);
    assert(skyObservationFrameCurrent(latest, at(2), pending.presentationGeneration, at(1)),
      'a requested but unpainted target must not become the lower bound for completed frames');
    assert.equal(skyObservationFrameCurrent(latest, at(2), pending.presentationGeneration, at(4)), false);
  }
});

test('a disjoint completed window stops interpolation without retiring the active field preparation lease', () => {
  const time = make(), a = '2026-09-28T13:00:17.123Z', b = '2026-09-27T13:00:19.456Z';
  time.edit('fields', true); time.preview(a, { fromAt: start, elapsedAt: 0 });
  const lease = time.preparationDemand().hold!;
  assert(lease); assert.equal(time.snapshot().previewMotion, 'waiting');
  const coverage = { startAt: '2026-09-28T12:00:00.000Z', endAt: '2026-09-28T14:00:00.000Z' };
  time.bind('context:1', start, coverage, { coverage, elapsedAt: 100 });
  assert.equal(time.snapshot().previewAt, null); assert.equal(time.snapshot().previewMotion, null);
  assert.equal(time.snapshot().presentationGeneration, lease.generation);
  assert.deepEqual(time.preparationDemand().hold, lease);
  time.preview(b, { fromAt: a, elapsedAt: 140 });
  assert.equal(time.snapshot().at, b); assert.deepEqual(time.preparationDemand().hold, lease);
  time.edit('fields', false);
  assert.equal(time.preparationDemand().editing, false); assert.equal(time.preparationDemand().hold, undefined);
  time.edit('fields', true);
  assert.equal(time.preparationDemand().editing, true); assert.equal(time.preparationDemand().hold, undefined,
    'a new touch cannot borrow the previous held lease before making its own input');
});

test('ruler editing and lifecycle retirement never expose a field preparation lease', () => {
  const time = make();
  time.edit('fields', true); time.preview(end, { fromAt: start, elapsedAt: 0 });
  assert(time.preparationDemand().hold);
  time.edit('ruler', true); time.preview('2026-09-29T13:10:00.000Z', { fromAt: start, elapsedAt: 10 });
  assert.equal(time.preparationDemand().hold, undefined);
  time.hide(20); assert.equal(time.preparationDemand().editing, false); assert.equal(time.preparationDemand().hold, undefined);
});

test('only one monotonic held-field edit shares paint eligibility; reverse and a new touch retire it', () => {
  const time = make(), first = '2026-09-29T13:01:00.000Z', second = '2026-09-29T13:02:00.000Z';
  time.edit('fields', true);
  const a = time.preview(first), b = time.preview(second);
  assert.equal(b.presentationGeneration, a.presentationGeneration);
  assert(skyObservationFrameCurrent(b, first, a.presentationGeneration), 'an initial draw can finish before any previous receipt exists');
  assert.equal(skyObservationFrameCurrent(b, start, a.presentationGeneration, first), false, 'completed frames cannot rewind');
  const reverse = time.preview(first);
  assert.notEqual(reverse.presentationGeneration, b.presentationGeneration);
  assert.equal(skyObservationFrameCurrent(reverse, first, b.presentationGeneration), false);
  time.edit('fields', false); time.edit('fields', true);
  const nextTouch = time.preview(start);
  assert.notEqual(nextTouch.presentationGeneration, reverse.presentationGeneration);
  assert.equal(skyObservationFrameCurrent(nextTouch, first, reverse.presentationGeneration), false);
});
