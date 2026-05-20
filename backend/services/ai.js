const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Fallback: load OpenRouter creds from canonical source if not present
if (!process.env.OPENROUTER_API_KEY) {
  try {
    const canonPath = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';
    if (fs.existsSync(canonPath)) {
      const content = fs.readFileSync(canonPath, 'utf8');
      const keyMatch = content.match(/^OPENROUTER_API_KEY=(.*)$/m);
      const modelMatch = content.match(/^OPENROUTER_MODEL=(.*)$/m);
      if (keyMatch) process.env.OPENROUTER_API_KEY = keyMatch[1].replace(/^"|"$/g, '').trim();
      if (modelMatch && !process.env.OPENROUTER_MODEL) {
        process.env.OPENROUTER_MODEL = modelMatch[1].replace(/^"|"$/g, '').trim();
      }
    }
  } catch (e) {
    console.warn('[ai-service] could not load canonical creds:', e.message);
  }
}

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const SOC_SYSTEM_PROMPT = 'You are a senior security operations analyst and threat intelligence expert. Provide concise, actionable, defender-focused guidance. Always reply in valid JSON when a JSON shape is requested.';

function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return resolve({ error: 'OPENROUTER_API_KEY is not configured', summary: 'AI unavailable.' });
    }

    const data = JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1800,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI CyberSOC Copilot',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); }
        catch (_) { return resolve({ error: 'AI response parsing failed', raw: body }); }
        if (parsed.error) {
          return resolve({ error: parsed.error.message || 'OpenRouter error', raw: body });
        }
        const content = parsed.choices?.[0]?.message?.content || '';
        resolve(content);
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    req.write(data);
    req.end();
  });
}

function safeJsonParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) {
    return { ...fallback, error: response.error, raw: response.raw };
  }
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const text = String(response).trim();

  try { return JSON.parse(text); } catch (_) { /* fall through */ }

  try {
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, escape = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return JSON.parse(text.slice(start, i + 1));
        }
      }
    }
  } catch (_) { /* fall through */ }

  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) return JSON.parse(fenced[1].trim());
  } catch (_) { /* fall through */ }

  return { ...fallback, summary: text };
}

// AI 1: Triage open alerts
async function triageAlerts(alerts) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Triage the supplied alerts. Return JSON in this exact shape:
{
  "triaged": [
    { "alert_id": string, "title": string, "priority": "P1"|"P2"|"P3"|"P4", "recommended_action": string, "rationale": string, "suspected_tactic": string }
  ],
  "summary": string,
  "next_steps": [string]
}`;
  const user = `Open alerts (newest first):\n${JSON.stringify(alerts, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', triaged: [], next_steps: [] });
}

// AI 2: Build a threat hunt from a hypothesis
async function buildHunt({ hypothesis, environment, data_sources }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Build a structured threat hunt. Return JSON in this exact shape:
{
  "hypothesis": string,
  "mitre_techniques": [{ "id": string, "name": string }],
  "data_sources": [string],
  "queries": [{ "platform": string, "query": string, "purpose": string }],
  "expected_signals": [string],
  "false_positive_traps": [string],
  "success_criteria": string,
  "summary": string
}`;
  const user = `Hypothesis: ${hypothesis}\nEnvironment: ${environment || 'mixed Windows/Linux endpoints with EDR + SIEM'}\nAvailable data sources: ${(data_sources || []).join(', ') || 'EDR, SIEM, DNS, proxy, identity logs'}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', queries: [] });
}

// AI 3: Enrich an indicator of compromise
async function enrichIoc(ioc) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Enrich the IOC with likely context. Return JSON in this exact shape:
{
  "ioc": { "type": string, "value": string },
  "likely_threat_actors": [string],
  "associated_malware": [string],
  "kill_chain_phase": string,
  "confidence": number,
  "recommended_blocks": [{ "control": string, "where": string }],
  "pivot_queries": [{ "platform": string, "query": string }],
  "summary": string
}`;
  const user = `IOC type: ${ioc.type}\nValue: ${ioc.value}\nSource: ${ioc.source || 'unknown'}\nFirst seen: ${ioc.first_seen || 'unknown'}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', recommended_blocks: [] });
}

// AI 4: Executive brief from incident/alert stats
async function executiveBrief(stats) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Produce an executive-level SOC brief suitable for a CISO. Return JSON in this exact shape:
{
  "headline": string,
  "posture": "Strong"|"Stable"|"Strained"|"Critical",
  "top_risks": [{ "risk": string, "impact": string, "owner": string }],
  "key_metrics": [{ "label": string, "value": string, "trend": "up"|"down"|"stable" }],
  "wins": [string],
  "asks": [string],
  "summary": string
}`;
  const user = `Current SOC stats:\n${JSON.stringify(stats, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', top_risks: [] });
}

// AI 5: Draft a SOAR playbook
async function draftPlaybook({ trigger, goal, constraints }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Draft a SOAR playbook. Return JSON in this exact shape:
{
  "name": string,
  "trigger": string,
  "goal": string,
  "steps": [{ "step": number, "action": string, "owner": "SOC"|"IR"|"IT"|"Automation", "tool": string, "expected_output": string }],
  "decision_points": [{ "after_step": number, "condition": string, "branch": string }],
  "rollback": [string],
  "estimated_runtime_minutes": number,
  "summary": string
}`;
  const user = `Trigger: ${trigger}\nGoal: ${goal}\nConstraints: ${constraints || 'least-privilege, auditable, reversible where possible'}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', steps: [] });
}

// AI 6: Shift handover
async function shiftHandover({ outgoing_shift, open_incidents, open_alerts, watchlist }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Generate a shift handover briefing for the incoming SOC analyst team. Return JSON in this exact shape:
{
  "outgoing_shift": string,
  "incoming_focus": [string],
  "active_incidents": [{ "incident_id": string, "status": string, "next_action": string, "owner": string }],
  "alerts_to_watch": [{ "alert_id": string, "why": string }],
  "watchlist_iocs": [string],
  "open_questions": [string],
  "summary": string
}`;
  const user = `Outgoing shift: ${outgoing_shift}\nOpen incidents:\n${JSON.stringify(open_incidents || [], null, 2)}\nOpen alerts:\n${JSON.stringify(open_alerts || [], null, 2)}\nWatchlist:\n${JSON.stringify(watchlist || [], null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', active_incidents: [] });
}

// ============================================================
// 10 NEW AI VERBS
// ============================================================

// AI 7: Red team attack plan
async function redTeam({ scenario, environment }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Produce a defender-oriented red team attack plan for the supplied scenario. Return JSON in this exact shape:
{
  "scenario": string,
  "kill_chain": [{ "phase": string, "action": string, "expected_artifact": string }],
  "mitre_techniques": [{ "id": string, "name": string }],
  "blue_team_detections": [string],
  "objectives": [string],
  "success_criteria": string,
  "summary": string
}`;
  const user = `Scenario: ${scenario}\nEnvironment: ${environment || 'enterprise: Windows AD + AWS + EDR'}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', kill_chain: [] });
}

// AI 8: Phishing email classifier
async function phishingClassifier({ email }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Classify the supplied email for phishing risk. Return JSON in this exact shape:
{
  "verdict": "phishing"|"suspicious"|"benign",
  "score": number,
  "indicators": [{ "indicator": string, "evidence": string, "severity": "low"|"medium"|"high" }],
  "recommended_actions": [string],
  "summary": string
}`;
  const user = `Email content / headers:\n${typeof email === 'string' ? email : JSON.stringify(email, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', indicators: [] });
}

// AI 9: Policy diff
async function policyDiff({ old_policy, new_policy }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Compare the two policies semantically and assess risk impact. Return JSON in this exact shape:
{
  "added_controls": [string],
  "removed_controls": [string],
  "weakened_controls": [string],
  "strengthened_controls": [string],
  "risk_impact": "increased"|"decreased"|"neutral",
  "risk_score_delta": number,
  "summary": string
}`;
  const user = `OLD POLICY:\n${old_policy}\n\n---\n\nNEW POLICY:\n${new_policy}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', added_controls: [] });
}

// AI 10: MITRE ATT&CK mapper
async function mitreMapper({ ttp_text }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Map the supplied TTP description to MITRE ATT&CK techniques and tactics. Return JSON in this exact shape:
{
  "primary_technique": { "id": string, "name": string, "tactic": string },
  "related_techniques": [{ "id": string, "name": string, "tactic": string }],
  "detection_data_sources": [string],
  "mitigations": [{ "id": string, "name": string }],
  "summary": string
}`;
  const user = `TTP description:\n${ttp_text || 'Adversary used PowerShell to download a payload from a typosquatted CDN and added a scheduled task for persistence.'}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', related_techniques: [] });
}

// AI 11: Compromise likelihood assessment
async function compromiseAssess({ asset }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Assess compromise likelihood for the asset and list candidate IOCs to investigate. Return JSON in this exact shape:
{
  "asset": string,
  "compromise_likelihood": "low"|"medium"|"high"|"critical",
  "likelihood_score": number,
  "key_signals": [string],
  "iocs_to_investigate": [{ "type": string, "value": string, "why": string }],
  "containment_actions": [string],
  "summary": string
}`;
  const user = `Asset:\n${typeof asset === 'string' ? asset : JSON.stringify(asset, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', key_signals: [] });
}

// AI 12: Remediation cost / time estimator
async function remediationEstimator({ incident }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Estimate remediation cost, time, and resources for the incident. Return JSON in this exact shape:
{
  "incident": string,
  "estimated_cost_usd": number,
  "estimated_time_hours": number,
  "resources": [{ "role": string, "headcount": number, "hours": number }],
  "phases": [{ "phase": string, "tasks": [string], "duration_hours": number }],
  "summary": string
}`;
  const user = `Incident:\n${typeof incident === 'string' ? incident : JSON.stringify(incident, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', phases: [] });
}

// AI 13: Log anomaly clustering
async function logAnomaly({ log_window }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Cluster anomalies in the supplied log window. Return JSON in this exact shape:
{
  "clusters": [{
    "label": string,
    "count": number,
    "severity": "low"|"medium"|"high"|"critical",
    "example_event": string,
    "suspected_cause": string
  }],
  "outliers": [string],
  "summary": string
}`;
  const user = `Log window (sample or stats):\n${typeof log_window === 'string' ? log_window : JSON.stringify(log_window, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', clusters: [] });
}

// AI 14: Identity risk
async function identityRisk({ user }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Compute identity risk for the supplied user and surface access anomalies. Return JSON in this exact shape:
{
  "user": string,
  "risk_score": number,
  "risk_band": "low"|"medium"|"high"|"critical",
  "access_anomalies": [{ "anomaly": string, "evidence": string }],
  "excessive_privileges": [string],
  "recommended_actions": [string],
  "summary": string
}`;
  const userPrompt = `User context:\n${typeof user === 'string' ? user : JSON.stringify(user, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, userPrompt);
  return safeJsonParse(r, { summary: '', access_anomalies: [] });
}

// AI 15: Supply chain scan
async function supplyChainScan({ vendor }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Perform a third-party supply chain risk scan for the vendor. Return JSON in this exact shape:
{
  "vendor": string,
  "risk_score": number,
  "third_party_dependencies": [string],
  "known_breach_history": [string],
  "compliance_signals": [{ "framework": string, "status": string }],
  "recommended_questions": [string],
  "summary": string
}`;
  const user = `Vendor:\n${typeof vendor === 'string' ? vendor : JSON.stringify(vendor, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', third_party_dependencies: [] });
}

// AI 16: Breach executive narrative
async function breachNarrative({ incident }) {
  const systemPrompt = `${SOC_SYSTEM_PROMPT} Produce an executive-ready breach narrative suitable for board / regulator briefing. Return JSON in this exact shape:
{
  "headline": string,
  "what_happened": string,
  "how_we_detected_it": string,
  "what_we_did": [string],
  "customer_impact": string,
  "regulatory_considerations": [string],
  "next_actions": [string],
  "summary": string
}`;
  const user = `Incident:\n${typeof incident === 'string' ? incident : JSON.stringify(incident, null, 2)}`;
  const r = await callOpenRouter(systemPrompt, user);
  return safeJsonParse(r, { summary: '', what_we_did: [] });
}

module.exports = {
  callOpenRouter,
  safeJsonParse,
  triageAlerts,
  buildHunt,
  enrichIoc,
  executiveBrief,
  draftPlaybook,
  shiftHandover,
  // new
  redTeam,
  phishingClassifier,
  policyDiff,
  mitreMapper,
  compromiseAssess,
  remediationEstimator,
  logAnomaly,
  identityRisk,
  supplyChainScan,
  breachNarrative,
};
