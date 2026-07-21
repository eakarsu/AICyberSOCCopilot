'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAlert, validateAction, assertTransition } = require('../domain/socCaseWorkflow');

test('normalizes a typed alert envelope', () => {
  const alert = validateAlert({ source_system: 'SIEM', source_event_id: 'evt-1', title: 'Suspicious login', severity: 'HIGH', observed_at: '2026-01-01T00:00:00Z' });
  assert.equal(alert.severity, 'high');
  assert.deepEqual(alert.asset_refs, []);
});

test('requires admin and separation for approval at route boundary', () => {
  assert.throws(() => assertTransition('awaiting_approval', 'approved', 'analyst'), /Only admin/);
  assert.doesNotThrow(() => assertTransition('awaiting_approval', 'approved', 'admin'));
});

test('disruptive action is explicit and no execution function exists', () => {
  const action = validateAction({ type: 'isolate_host', rationale: 'Contain spread', disruptive: true, target_refs: ['host-1'] });
  assert.equal(action.disruptive, true);
  assert.throws(() => assertTransition('response_proposed', 'execution_recorded', 'admin'), /not allowed/);
});
