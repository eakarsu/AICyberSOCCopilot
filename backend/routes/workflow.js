'use strict';

const crypto = require('crypto');
const express = require('express');
const pool = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateAlert, validateAction, assertTransition } = require('../domain/socCaseWorkflow');
const { buildResponsePlaybook, replayEvaluate } = require('../domain/attackPlaybooks');

const router = express.Router();
const writers = requireRole('analyst', 'admin');

router.post('/playbooks/preview', writers, (req,res) => res.json(buildResponsePlaybook(req.body?.alert||{})));
router.post('/playbooks/replay', requireRole('admin'), (req,res) => { try { res.json(replayEvaluate(req.body?.examples)); } catch(error) { fail(res,error); } });

function actor(req) { return String(req.user.id); }
function fail(res, error) {
  const status = /not found/i.test(error.message) ? 404 : /not allowed|Only admin|Role|distinct/i.test(error.message) ? 403 : 400;
  return res.status(status).json({ error: error.message });
}
async function audit(client, req, caseId, eventType, fromStatus, toStatus, detail = {}) {
  await client.query(
    `INSERT INTO soc_case_audit (case_id, tenant_id, actor_id, actor_role, event_type, from_status, to_status, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [caseId, req.user.tenant_id, actor(req), req.user.role, eventType, fromStatus, toStatus, detail]
  );
}

router.get('/cases', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const params = [req.user.tenant_id];
  const where = status ? 'AND status = $2' : '';
  if (status) params.push(status);
  try {
    const result = await pool.query(
      `SELECT * FROM soc_cases WHERE tenant_id = $1 ${where} ORDER BY updated_at DESC LIMIT 200`, params
    );
    return res.json(result.rows);
  } catch (_) { return res.status(500).json({ error: 'Unable to list cases' }); }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const [record, evidence, auditRows] = await Promise.all([
      pool.query('SELECT * FROM soc_cases WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenant_id]),
      pool.query('SELECT * FROM soc_case_evidence WHERE case_id=$1 AND tenant_id=$2 ORDER BY created_at', [req.params.id, req.user.tenant_id]),
      pool.query('SELECT * FROM soc_case_audit WHERE case_id=$1 AND tenant_id=$2 ORDER BY created_at', [req.params.id, req.user.tenant_id]),
    ]);
    if (!record.rows[0]) return res.status(404).json({ error: 'Case not found' });
    return res.json({ case: record.rows[0], evidence: evidence.rows, audit: auditRows.rows });
  } catch (_) { return res.status(500).json({ error: 'Unable to load case' }); }
});

router.post('/cases', writers, async (req, res) => {
  try {
    const alert = validateAlert(req.body?.alert);
    const id = crypto.randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO soc_cases
         (id,tenant_id,source_system,source_event_id,title,severity,observed_at,asset_refs,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'triage',$9) RETURNING *`,
        [id, req.user.tenant_id, alert.source_system, alert.source_event_id, alert.title, alert.severity, alert.observed_at, alert.asset_refs, actor(req)]
      );
      await audit(client, req, id, 'case.created', null, 'triage', { alert: { ...alert, asset_refs: undefined } });
      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { return fail(res, error); }
});

router.post('/cases/:id/evidence', writers, async (req, res) => {
  const body = req.body || {};
  try {
    if (typeof body.source !== 'string' || !body.source.trim() || body.source.length > 150) throw new Error('source is invalid');
    if (typeof body.summary !== 'string' || !body.summary.trim() || body.summary.length > 5000) throw new Error('summary is invalid');
    if (!/^[a-f0-9]{64}$/i.test(body.sha256 || '')) throw new Error('sha256 is invalid');
    if (!['public','internal','confidential','restricted'].includes(body.classification)) throw new Error('classification is invalid');
    const observed = new Date(body.observed_at);
    if (!Number.isFinite(observed.getTime())) throw new Error('observed_at is invalid');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const record = await client.query('SELECT status FROM soc_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, req.user.tenant_id]);
      if (!record.rows[0]) throw new Error('Case not found');
      if (record.rows[0].status === 'closed') throw new Error('Closed case cannot accept evidence');
      const id = crypto.randomUUID();
      const result = await client.query(
        `INSERT INTO soc_case_evidence (id,case_id,tenant_id,source,summary,sha256,classification,observed_at,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, req.params.id, req.user.tenant_id, body.source.trim(), body.summary.trim(), body.sha256.toLowerCase(), body.classification, observed.toISOString(), actor(req)]
      );
      await audit(client, req, req.params.id, 'evidence.added', record.rows[0].status, record.rows[0].status, { evidence_id: id, sha256: body.sha256.toLowerCase() });
      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { return fail(res, error); }
});

router.post('/cases/:id/transition', writers, async (req, res) => {
  const to = req.body?.to;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM soc_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, req.user.tenant_id]);
    const record = result.rows[0];
    if (!record) throw new Error('Case not found');
    assertTransition(record.status, to, req.user.role);
    const updates = { proposed_action: record.proposed_action, proposed_by: record.proposed_by, approved_by: record.approved_by, external_result: record.external_result, failure_reason: record.failure_reason };
    if (to === 'response_proposed') {
      updates.proposed_action = validateAction(req.body?.proposed_action);
      updates.proposed_by = actor(req);
      updates.approved_by = null;
    }
    if (to === 'awaiting_approval' && !updates.proposed_action) throw new Error('A proposed action is required');
    if (to === 'approved') {
      if (String(updates.proposed_by) === actor(req)) throw new Error('Approver must be distinct from proposer');
      updates.approved_by = actor(req);
    }
    if (to === 'execution_recorded') {
      const execution = req.body?.external_result;
      if (!execution || typeof execution.executor_ref !== 'string' || !execution.executor_ref.trim() || typeof execution.success !== 'boolean') {
        throw new Error('external_result with executor_ref and success is required');
      }
      updates.external_result = { executor_ref: execution.executor_ref.slice(0, 300), success: execution.success, observed_at: new Date(execution.observed_at || Date.now()).toISOString(), note: String(execution.note || '').slice(0, 2000) };
    }
    if (to === 'failed') {
      if (typeof req.body?.failure_reason !== 'string' || !req.body.failure_reason.trim()) throw new Error('failure_reason is required');
      updates.failure_reason = req.body.failure_reason.slice(0, 2000);
    }
    const updated = await client.query(
      `UPDATE soc_cases SET status=$1, proposed_action=$2, proposed_by=$3, approved_by=$4, external_result=$5,
       failure_reason=$6, version=version+1, updated_at=NOW() WHERE id=$7 AND tenant_id=$8 RETURNING *`,
      [to, updates.proposed_action, updates.proposed_by, updates.approved_by, updates.external_result, updates.failure_reason, req.params.id, req.user.tenant_id]
    );
    await audit(client, req, req.params.id, 'case.transitioned', record.status, to, { reason: String(req.body?.reason || '').slice(0, 1000) });
    await client.query('COMMIT');
    return res.json(updated.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    return fail(res, error);
  } finally { if (client) client.release(); }
});

module.exports = router;
