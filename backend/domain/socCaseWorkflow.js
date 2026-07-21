'use strict';

const STATES = Object.freeze([
  'triage', 'investigating', 'response_proposed', 'awaiting_approval',
  'approved', 'execution_recorded', 'closed', 'failed',
]);

const TRANSITIONS = Object.freeze({
  triage: ['investigating', 'failed'],
  investigating: ['response_proposed', 'closed', 'failed'],
  response_proposed: ['awaiting_approval', 'investigating', 'failed'],
  awaiting_approval: ['approved', 'response_proposed', 'failed'],
  approved: ['execution_recorded', 'failed'],
  execution_recorded: ['closed', 'failed'],
  failed: ['investigating', 'closed'],
  closed: [],
});

function text(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} is invalid`);
  return value.trim();
}

function validateAlert(input) {
  if (!input || typeof input !== 'object') throw new Error('alert is required');
  const severity = String(input.severity || '').toLowerCase();
  if (!['low', 'medium', 'high', 'critical'].includes(severity)) throw new Error('severity is invalid');
  const observedAt = new Date(input.observed_at);
  if (!Number.isFinite(observedAt.getTime())) throw new Error('observed_at is invalid');
  return {
    source_system: text(input.source_system, 'source_system', 100),
    source_event_id: text(input.source_event_id, 'source_event_id', 200),
    title: text(input.title, 'title', 500),
    severity,
    observed_at: observedAt.toISOString(),
    asset_refs: Array.isArray(input.asset_refs) ? input.asset_refs.slice(0, 50).map(String) : [],
  };
}

function validateAction(input) {
  if (!input || typeof input !== 'object') throw new Error('proposed_action is required');
  return {
    type: text(input.type, 'action type', 100),
    rationale: text(input.rationale, 'rationale', 2000),
    disruptive: input.disruptive === true,
    target_refs: Array.isArray(input.target_refs) ? input.target_refs.slice(0, 100).map(String) : [],
  };
}

function assertTransition(from, to, role) {
  if (!STATES.includes(from) || !STATES.includes(to) || !(TRANSITIONS[from] || []).includes(to)) {
    throw new Error(`Transition ${from} -> ${to} is not allowed`);
  }
  if (!['analyst', 'admin'].includes(role)) throw new Error('Role cannot change case state');
  if (['approved', 'execution_recorded'].includes(to) && role !== 'admin') {
    throw new Error(`Only admin may transition to ${to}`);
  }
}

module.exports = { STATES, TRANSITIONS, validateAlert, validateAction, assertTransition };
