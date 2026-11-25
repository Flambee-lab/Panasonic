import assert from 'node:assert/strict';
import { applyExceptionToRules, exceptionAssignmentIssue } from '../src/utils/exceptionAssignments.js';

const hours = { id: 'holiday', name: 'Holiday hours', type: 'hours', dates: ['2026-10-26'], ranges: [{ start: 600, end: 720 }], repeatYearly: false };
const other = { ...hours, id: 'other', name: 'Other exception' };
const rule = (id, overrides = {}) => ({ id, name: id, revision: 1, exceptions: [], ...overrides });
const weekly = { repeat: 'weekly', ranges: { Monday: [{ start: 600, end: 720 }] } };
const same = (value) => structuredClone(value);

// Assignment does not revalidate unrelated baseline rule problems.
const midday = rule('Midday', { peopleIds: ['removed-person'], cameraIds: ['unsupported-camera'], schedule: null, eventTypeIds: [] });
assert.equal(exceptionAssignmentIssue(midday, hours), '');
let result = applyExceptionToRules([midday], hours, ['Midday']);
assert.equal(result.ok, true);
assert.deepEqual(result.rules[0].exceptions, [hours]);
assert.equal(result.rules[0].revision, 2);
assert.deepEqual(midday.exceptions, []);
assert.notEqual(result.rules[0].exceptions[0], hours);

// Every affected rule receives its own copy; unrelated rules retain identity.
const original = [rule('one'), rule('two'), rule('untouched')];
result = applyExceptionToRules(original, hours, ['one', 'two', 'two']);
assert.equal(result.ok, true);
assert.equal(result.rules[0].exceptions.length, 1);
assert.equal(result.rules[1].exceptions.length, 1);
assert.notEqual(result.rules[0].exceptions[0], result.rules[1].exceptions[0]);
assert.equal(result.rules[2], original[2]);
result.rules[0].exceptions[0].ranges[0].start = 700;
assert.equal(result.rules[1].exceptions[0].ranges[0].start, 600);
assert.equal(hours.ranges[0].start, 600);

// Updating preserves priority order and removes only duplicate copies of this id.
const old = { ...hours, name: 'Old name' };
const withCopies = [rule('one', { revision: 4, exceptions: [other, old, same(old)] }), rule('two', { exceptions: [old, other] })];
result = applyExceptionToRules(withCopies, hours, ['one']);
assert.equal(result.ok, true);
assert.deepEqual(result.rules[0].exceptions.map((item) => item.id), ['other', 'holiday']);
assert.equal(result.rules[0].exceptions[1].name, 'Holiday hours');
assert.equal(result.rules[0].exceptions[0], other);
assert.equal(result.rules[0].revision, 5);
assert.deepEqual(result.rules[1].exceptions, [other]);
assert.equal(result.rules[1].revision, 2);
assert.equal(withCopies[0].exceptions.length, 3);
assert.equal(withCopies[0].exceptions[1].name, 'Old name');

// Equivalent data, including a different object-key order, is a no-op.
const reordered = { repeatYearly: false, ranges: [{ end: 720, start: 600 }], dates: ['2026-10-26'], type: 'hours', name: 'Holiday hours', id: 'holiday' };
const noOp = [rule('one', { revision: 7, exceptions: [reordered] })];
result = applyExceptionToRules(noOp, hours, ['one']);
assert.equal(result.ok, true);
assert.equal(result.rules, noOp);
assert.equal(result.rules[0].revision, 7);

// Locked rules cannot gain new assignments and never lose or update old ones.
const locked = rule('locked', { locked: 'View only', revision: 8, exceptions: [old] });
assert.equal(exceptionAssignmentIssue(locked, hours), '');
const lockedRules = [locked, rule('editable', { exceptions: [old] })];
result = applyExceptionToRules(lockedRules, hours, ['editable', 'locked']);
assert.equal(result.ok, true);
assert.equal(result.rules[0], locked);
assert.equal(result.rules[0].exceptions[0], old);
result = applyExceptionToRules(lockedRules, hours, []);
assert.equal(result.ok, true);
assert.equal(result.rules[0], locked);
assert.deepEqual(result.rules[1].exceptions, []);
const lockedNew = rule('locked-new', { locked: true });
assert.match(exceptionAssignmentIssue(lockedNew, hours), /locked/i);
const lockedFailure = [rule('valid'), lockedNew];
const beforeLocked = same(lockedFailure);
result = applyExceptionToRules(lockedFailure, hours, ['valid', 'locked-new']);
assert.equal(result.ok, false);
assert.match(result.message, /locked-new.*locked/i);
assert.deepEqual(lockedFailure, beforeLocked);

// Unknown IDs and a new exception with no editable destination fail atomically.
for (const ids of [[], ['missing'], ['valid', 'missing']]) {
  const rules = [rule('valid')];
  const before = same(rules);
  result = applyExceptionToRules(rules, hours, ids);
  assert.equal(result.ok, false);
  assert.match(result.message, ids.length ? /missing.*no longer available/i : /at least one editable/i);
  assert.deepEqual(rules, before);
}
assert.equal(applyExceptionToRules([rule('valid')], { ...hours, id: undefined }, ['valid']).ok, false);

// Like-another-day checks only its referenced day's hours, including legacy daily schedules.
const followMonday = { ...hours, type: 'day', likeDay: 'Monday' };
const followSunday = { ...hours, type: 'day', likeDay: 'Sunday' };
const mondayRule = rule('Monday rule', { schedule: weekly });
assert.equal(exceptionAssignmentIssue(mondayRule, followMonday), '');
assert.match(exceptionAssignmentIssue(mondayRule, followSunday), /Sunday has no hours/);
assert.match(exceptionAssignmentIssue(rule('always-on'), followMonday), /Monday has no hours/);
assert.equal(exceptionAssignmentIssue(rule('daily', { schedule: { ranges: { Everyday: [{ start: 0, end: 1440 }] } } }), followSunday), '');
const dayRules = [mondayRule, rule('no-hours')];
const daySnapshot = same(dayRules);
result = applyExceptionToRules(dayRules, followMonday, ['Monday rule', 'no-hours']);
assert.equal(result.ok, false);
assert.match(result.message, /no-hours.*Monday has no hours/);
assert.deepEqual(dayRules, daySnapshot);

// Another-schedule needs an available source with hours, and may not refer to itself.
const borrowed = { ...hours, type: 'schedule', scheduleId: 'source', scheduleName: 'Source' };
const source = rule('source', { name: 'Source', on: false, schedule: weekly });
const target = rule('target', { schedule: null });
assert.equal(exceptionAssignmentIssue(target, borrowed, [source, target]), '');
assert.match(exceptionAssignmentIssue(source, borrowed, [source]), /own schedule/);
assert.match(exceptionAssignmentIssue(target, borrowed, [target]), /no longer available/);
assert.match(exceptionAssignmentIssue(target, borrowed, [rule('source', { locked: true })]), /locked/);
assert.match(exceptionAssignmentIssue(target, borrowed, [rule('source')]), /no weekly hours/);
result = applyExceptionToRules([source, target], borrowed, ['target']);
assert.equal(result.ok, true);
assert.equal(result.rules[0], source);
assert.equal(result.rules[1].exceptions[0].scheduleId, 'source');
const scheduleSnapshot = same([source, target]);
result = applyExceptionToRules([source, target], borrowed, ['target', 'source']);
assert.equal(result.ok, false);
assert.deepEqual([source, target], scheduleSnapshot);

// Date overlap already has priority semantics; it does not block assignment.
result = applyExceptionToRules([rule('overlap', { exceptions: [other] })], hours, ['overlap']);
assert.equal(result.ok, true);
assert.deepEqual(result.rules[0].exceptions.map((item) => item.id), ['other', 'holiday']);
console.log('✓ Atomic exception assignments, revisions, locked associations, editable destinations, daily/weekly hours, schedule sources and unrelated baseline warnings');
