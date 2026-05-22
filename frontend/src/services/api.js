const API_BASE = 'http://localhost:3010/api';

const TOKEN_KEY = 'soc_token';
const USER_KEY = 'soc_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; }
};
export const setSession = (token, user) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
export const isAuthed = () => !!getToken();

// Role helpers
export const getRole  = () => (getUser() || {}).role || null;
export const canWrite = () => ['admin', 'analyst'].includes(getRole());
export const isAdmin  = () => getRole() === 'admin';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const isAuthRoute = url.startsWith('/auth/');
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && !isAuthRoute) {
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// Form-data request (no JSON Content-Type)
async function requestForm(url, formData) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const me = () => request('/auth/me');

// Dashboard
export const getDashboardStats = () => request('/dashboard/stats');

// CRUD generic helpers
const crud = (base) => ({
  list:   ()           => request(`/${base}`),
  get:    (id)         => request(`/${base}/${id}`),
  create: (data)       => request(`/${base}`,        { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data)   => request(`/${base}/${id}`,  { method: 'PUT',    body: JSON.stringify(data) }),
  remove: (id)         => request(`/${base}/${id}`,  { method: 'DELETE' }),
  bulkImport: (csv) => {
    const fd = new FormData();
    if (csv instanceof File) fd.append('file', csv);
    else fd.append('csv', String(csv));
    return requestForm(`/${base}/bulk-import`, fd);
  },
});

// Original CRUD
export const alertsApi          = crud('alerts');
export const incidentsApi       = crud('incidents');
export const assetsApi          = crud('assets');
export const playbooksApi       = crud('playbooks');
export const iocsApi            = crud('iocs');
export const threatIntelApi     = crud('threat-intel-feed');
export const shiftRosterApi     = crud('shift-roster');
export const auditLogApi        = crud('audit-log');

// New CRUD
export const vulnerabilitiesApi = crud('vulnerabilities');
export const exceptionsApi      = crud('exceptions');
export const changeRequestsApi  = crud('change-requests');
export const vendorRiskApi      = crud('vendor-risk');
export const certificatesApi    = crud('certificates');
export const secretsVaultApi    = crud('secrets-vault');
export const runbooksApi        = crud('runbooks');
export const evidenceLibraryApi = crud('evidence-library');
export const allowlistsApi      = crud('allowlists');
export const blocklistsApi      = crud('blocklists');

// AI endpoints (original 6)
export const aiTriageAlerts    = (body) => request('/ai/triage-alerts',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiBuildHunt       = (body) => request('/ai/build-hunt',      { method: 'POST', body: JSON.stringify(body || {}) });
export const aiEnrichIoc       = (body) => request('/ai/enrich-ioc',      { method: 'POST', body: JSON.stringify(body || {}) });
export const aiExecutiveBrief  = (body) => request('/ai/executive-brief', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiDraftPlaybook   = (body) => request('/ai/draft-playbook',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiShiftHandover   = (body) => request('/ai/shift-handover',  { method: 'POST', body: JSON.stringify(body || {}) });

// AI endpoints (new 10)
export const aiRedTeam              = (body) => request('/ai/red-team',              { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPhishingClassifier   = (body) => request('/ai/phishing-classifier',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPolicyDiff           = (body) => request('/ai/policy-diff',           { method: 'POST', body: JSON.stringify(body || {}) });
export const aiMitreMapper          = (body) => request('/ai/mitre-mapper',          { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCompromiseAssess     = (body) => request('/ai/compromise-assess',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRemediationEstimator = (body) => request('/ai/remediation-estimator', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiLogAnomaly           = (body) => request('/ai/log-anomaly',           { method: 'POST', body: JSON.stringify(body || {}) });
export const aiIdentityRisk         = (body) => request('/ai/identity-risk',         { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSupplyChainScan      = (body) => request('/ai/supply-chain-scan',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiBreachNarrative      = (body) => request('/ai/breach-narrative',      { method: 'POST', body: JSON.stringify(body || {}) });

// Pass 7 — AI endpoints (5 new mechanical verbs)
export const aiFalsePositiveReducer = (body) => request('/ai/false-positive-reducer', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPlaybookRecommend    = (body) => request('/ai/playbook-recommend',    { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPostIncidentReport   = (body) => request('/ai/post-incident-report',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiLogQueryCopilot      = (body) => request('/ai/log-query-copilot',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiTabletopExercise     = (body) => request('/ai/tabletop-exercise',     { method: 'POST', body: JSON.stringify(body || {}) });

// Pass 7 — On-call escalation engine
export const onCallApi = {
  policies: {
    list:   ()         => request('/oncall/policies'),
    get:    (id)       => request(`/oncall/policies/${id}`),
    create: (data)     => request('/oncall/policies',       { method: 'POST',   body: JSON.stringify(data) }),
    update: (id, data) => request(`/oncall/policies/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
    remove: (id)       => request(`/oncall/policies/${id}`, { method: 'DELETE' }),
  },
  pages: {
    list:     ()                       => request('/oncall/pages'),
    get:      (id)                     => request(`/oncall/pages/${id}`),
    page:     (data)                   => request('/oncall/page',             { method: 'POST', body: JSON.stringify(data) }),
    ack:      (id)                     => request(`/oncall/pages/${id}/ack`,      { method: 'POST', body: '{}' }),
    escalate: (id)                     => request(`/oncall/pages/${id}/escalate`, { method: 'POST', body: '{}' }),
    override: (id, override_to, reason)=> request(`/oncall/pages/${id}/override`, { method: 'POST', body: JSON.stringify({ override_to, reason }) }),
    resolve:  (id)                     => request(`/oncall/pages/${id}/resolve`,  { method: 'POST', body: '{}' }),
  },
};

// Pass 7 — Integrations status (NEEDS-CREDS stubs)
export const integrationsStatus = {
  siem:      () => request('/integrations/siem/status'),
  ticketing: () => request('/integrations/ticketing/status'),
};

export const aiHistory = (feature, limit = 20) => {
  const qs = new URLSearchParams({ ...(feature ? { feature } : {}), limit }).toString();
  return request(`/ai/history?${qs}`);
};

// GET /api/ai/samples?feature=<verb> → { samples: [{label, values}, ...] }
export const aiSamples = (feature) =>
  request(`/ai/samples?${new URLSearchParams({ feature }).toString()}`);

// Notifications
export const notificationsApi = {
  list:        () => request('/notifications'),
  unreadCount: () => request('/notifications/unread-count'),
  markRead:    (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/notifications/read-all',     { method: 'POST' }),
};

// Webhooks
export const webhooksApi = {
  list:    () => request('/webhooks'),
  create:  (data) => request('/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id, data) => request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove:  (id) => request(`/webhooks/${id}`, { method: 'DELETE' }),
  test:    (event, payload) => request('/webhooks/test', { method: 'POST', body: JSON.stringify({ event, payload }) }),
  deliveries: () => request('/webhooks/deliveries'),
};

// Custom SOC Views (2 VIZ + 2 NON-VIZ)
export const customViewsApi = {
  alertTimeline: () => request('/custom-views/alert-timeline'),
  mitreHeatmap: () => request('/custom-views/mitre-heatmap'),
  irReport:     (incidentId) =>
    request(`/custom-views/ir-report${incidentId ? `?incident_id=${encodeURIComponent(incidentId)}` : ''}`),
  rules: {
    list:   ()         => request('/custom-views/playbook-rules'),
    create: (data)     => request('/custom-views/playbook-rules',         { method: 'POST',   body: JSON.stringify(data) }),
    update: (id, data) => request(`/custom-views/playbook-rules/${id}`,   { method: 'PUT',    body: JSON.stringify(data) }),
    remove: (id)       => request(`/custom-views/playbook-rules/${id}`,   { method: 'DELETE' }),
  },
};

// Attachments
export const attachmentsApi = {
  list:   (ownerCollection, ownerId) => request(`/attachments/${ownerCollection}/${ownerId}`),
  upload: (file, ownerCollection, ownerId) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('owner_collection', ownerCollection);
    fd.append('owner_id', String(ownerId));
    return requestForm('/upload', fd);
  },
  fileUrl: (id) => `${API_BASE}/attachments/file/${id}`,
};
