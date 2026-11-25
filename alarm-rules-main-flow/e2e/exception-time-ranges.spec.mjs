import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultNextExceptionRange,
  parseTimeInput,
  toTimeInput,
  validateExceptionTimeRanges,
} from '../src/utils/exceptionTimeRanges.js';

test('complete HH:mm input is parsed strictly, including midnight', () => {
  assert.equal(parseTimeInput('00:00'), 0);
  assert.equal(parseTimeInput('09:05'), 545);
  assert.equal(parseTimeInput('23:59'), 1439);
  for (const value of ['', '1', '12:', '12:0', '9:05', '24:00', '23:60', ' 12:00', '12:00:00', null, 600]) {
    assert.equal(parseTimeInput(value), null, `Reject ${String(value)}`);
  }
  assert.equal(toTimeInput(0), '00:00');
  assert.equal(toTimeInput(1440), '00:00');
  assert.equal(toTimeInput(1565), '02:05');
  for (const value of [null, NaN, Infinity, -1, 1.5, '600']) assert.equal(toTimeInput(value), '');
});

test('overnight input retains next-day minutes and midnight endpoints', () => {
  assert.deepEqual(validateExceptionTimeRanges([{ start: '22:00', end: '02:00' }]), {
    ranges: [{ start: 1320, end: 1560 }], errors: [{}], valid: true,
  });
  assert.deepEqual(validateExceptionTimeRanges([{ start: '22:00', end: '00:00' }]).ranges, [
    { start: 1320, end: 1440 },
  ]);
  assert.deepEqual(validateExceptionTimeRanges([{ start: '00:00', end: '02:00' }]).ranges, [
    { start: 0, end: 120 },
  ]);
  const almostDay = validateExceptionTimeRanges([{ start: '00:01', end: '00:00' }]);
  assert.equal(almostDay.valid, true);
  assert.equal(almostDay.ranges[0].end - almostDay.ranges[0].start, 1439);
});

test('cleared, partial and malformed drafts stay unchanged and get row-specific errors', () => {
  const rows = [
    { start: '', end: '12:00' },
    { start: '12:', end: '14:00' },
    { start: '15:00', end: '24:00' },
    { start: '16:00', end: '' },
    { start: '18:00', end: '19:00' },
  ];
  const before = structuredClone(rows);
  const result = validateExceptionTimeRanges(rows);
  assert.equal(result.valid, false);
  assert.deepEqual(rows, before);
  assert.ok(result.errors[0].start);
  assert.ok(result.errors[1].start);
  assert.ok(result.errors[2].end);
  assert.ok(result.errors[3].end);
  assert.deepEqual(result.errors[4], {});
  assert.deepEqual(result.ranges, [{ start: 1080, end: 1140 }]);
  assert.equal(validateExceptionTimeRanges([]).valid, false);
  assert.equal(validateExceptionTimeRanges([{ start: '', end: '' }]).valid, false);
  assert.equal(defaultNextExceptionRange(rows), null);
});

test('equal endpoints are rejected instead of meaning a full day', () => {
  for (const clock of ['00:00', '12:00', '23:59']) {
    const result = validateExceptionTimeRanges([{ start: clock, end: clock }]);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].range);
    assert.deepEqual(result.ranges, []);
  }
  assert.equal(validateExceptionTimeRanges([{ start: '00:00', end: '24:00' }]).valid, false);
});

test('adjacent ranges are valid on both sides of midnight', () => {
  const rows = [
    { start: '22:00', end: '02:00' },
    { start: '02:00', end: '04:00' },
    { start: '20:00', end: '22:00' },
  ];
  assert.equal(validateExceptionTimeRanges(rows).valid, true);
  assert.equal(validateExceptionTimeRanges([
    { start: '22:00', end: '00:00' }, { start: '00:00', end: '02:00' },
  ]).valid, true);
});

test('overlaps identify both rows regardless of row order or overnight direction', () => {
  const cases = [
    [{ start: '10:00', end: '12:00' }, { start: '11:00', end: '13:00' }],
    [{ start: '22:00', end: '02:00' }, { start: '01:00', end: '03:00' }],
    [{ start: '22:00', end: '02:00' }, { start: '21:00', end: '23:00' }],
    [{ start: '22:00', end: '02:00' }, { start: '23:00', end: '01:00' }],
  ];
  for (const pair of cases) {
    for (const rows of [pair, [...pair].reverse()]) {
      const result = validateExceptionTimeRanges(rows);
      assert.equal(result.valid, false);
      assert.ok(result.errors[0].range);
      assert.ok(result.errors[1].range);
    }
  }
  const result = validateExceptionTimeRanges([
    { start: '', end: '04:00' },
    { start: '22:00', end: '02:00' },
    { start: '01:00', end: '03:00' },
  ]);
  assert.ok(result.errors[0].start);
  assert.equal(result.errors[0].range, undefined);
  assert.ok(result.errors[1].range);
  assert.ok(result.errors[2].range);
});

test('adding a range starts at the last end and avoids occupied minutes', () => {
  assert.deepEqual(defaultNextExceptionRange([]), { start: '10:00', end: '11:00' });
  assert.deepEqual(defaultNextExceptionRange([{ start: '10:00', end: '12:00' }]), {
    start: '12:00', end: '13:00',
  });
  assert.deepEqual(defaultNextExceptionRange([{ start: '22:00', end: '02:00' }]), {
    start: '02:00', end: '03:00',
  });
  const rows = [
    { start: '12:00', end: '14:00' },
    { start: '10:00', end: '12:00' },
  ];
  const before = structuredClone(rows);
  const next = defaultNextExceptionRange(rows);
  assert.deepEqual(next, { start: '14:00', end: '15:00' });
  assert.equal(validateExceptionTimeRanges([...rows, next]).valid, true);
  assert.deepEqual(rows, before);
});

test('adding clamps to free time and cannot duplicate an entirely covered day', () => {
  const nearlyFull = [{ start: '00:00', end: '23:30' }];
  const next = defaultNextExceptionRange(nearlyFull);
  assert.deepEqual(next, { start: '23:30', end: '00:00' });
  const full = [...nearlyFull, next];
  assert.equal(validateExceptionTimeRanges(full).valid, true);
  assert.equal(defaultNextExceptionRange(full), null);
  const oneMinute = [{ start: '00:01', end: '00:00' }];
  assert.deepEqual(defaultNextExceptionRange(oneMinute), { start: '00:00', end: '00:01' });
  assert.equal(defaultNextExceptionRange([...oneMinute, defaultNextExceptionRange(oneMinute)]), null);
});
