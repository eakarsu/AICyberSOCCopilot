const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');
const notifications = require('./notifications');
const { fireWebhooks } = require('../services/webhook');

// Persist AI result; swallow errors so AI flow never breaks
async function record(feature, input, result, actor, userId) {
  try {
    await pool.query(
      `INSERT INTO ai_results (feature, input, result, created_by) VALUES ($1,$2,$3,$4)`,
      [feature, input ?? {}, result ?? {}, actor || null]
    );
  } catch (e) {
    console.warn('[ai-history] failed to record', feature, e.message);
  }
  // Push in-app notification (best-effort)
  try {
    await notifications.create(userId || null, 'ai', `AI Copilot completed: ${feature}`);
  } catch (_) { /* swallow */ }
  // Fire webhook (best-effort)
  fireWebhooks(`ai.${feature}.completed`, { feature, by: actor, at: new Date().toISOString() }).catch(() => {});
}

function actorOf(req) {
  return (req.user && (req.user.email || req.user.name)) || 'anonymous';
}
function userIdOf(req) {
  return (req.user && req.user.id) || null;
}

// ============================================================
// Sample Fill — hardcoded realistic scenarios per AI verb.
// Field names MUST match the `inputs[].name` in the matching
// frontend page (frontend/src/pages/AI*Page.js) so the click
// handler can populate the form 1:1.
// ============================================================
const SAMPLES = {
  'triage-alerts': [
    { label: 'Live open alerts (default)', values: {} },
    { label: 'After-hours surge',          values: {} },
    { label: 'Post-patch wave',            values: {} },
    { label: 'Holiday weekend backlog',    values: {} },
    { label: 'Ransomware-adjacent batch',  values: {} },
  ],
  'build-hunt': [
    {
      label: 'DNS tunneling C2',
      values: {
        hypothesis: 'Adversary is using DNS tunneling (long TXT/NULL queries to a single second-level domain) for C2 from a corporate workstation.',
        environment: 'mixed Windows/Linux endpoints with CrowdStrike Falcon + Splunk SIEM',
        data_sources_csv: 'EDR, SIEM, DNS, proxy, identity',
      },
    },
    {
      label: 'Kerberoasting on AD',
      values: {
        hypothesis: 'A service account is being Kerberoasted: anomalous TGS-REQ (RC4, 0x17) bursts from a single workstation against multiple SPNs.',
        environment: 'Active Directory 2019, Microsoft Defender for Identity, Sentinel',
        data_sources_csv: 'Windows Security 4769, MDI, Sentinel',
      },
    },
    {
      label: 'AWS console takeover',
      values: {
        hypothesis: 'A legitimate AWS IAM user’s access keys were stolen and reused from an unusual ASN to enumerate S3 and create new IAM users.',
        environment: 'AWS multi-account org, GuardDuty + CloudTrail + Athena',
        data_sources_csv: 'CloudTrail, GuardDuty, IAM, S3 access logs',
      },
    },
    {
      label: 'Living-off-the-land (LOLBins)',
      values: {
        hypothesis: 'Attackers using certutil.exe and bitsadmin.exe to stage payloads on Windows endpoints, evading AV.',
        environment: 'Windows 10/11 workstations, MDE EDR, Splunk',
        data_sources_csv: 'EDR process telemetry, Sysmon 1/3/11, proxy',
      },
    },
    {
      label: 'OAuth consent phishing (M365)',
      values: {
        hypothesis: 'Users granting consent to a malicious 3rd-party app to read mail and files in M365 (illicit consent grant attack).',
        environment: 'Microsoft 365 E5, Defender for Cloud Apps, Entra ID',
        data_sources_csv: 'AzureAD AuditLogs, MDA, Exchange MessageTrace',
      },
    },
  ],
  'enrich-ioc': [
    { label: 'Cobalt Strike C2 (IPv4)',     values: { type: 'ipv4',   value: '185.220.101.45',                                    source: 'AbuseIPDB' } },
    { label: 'Emotet payload (SHA-256)',    values: { type: 'sha256', value: 'a7b9c2d4e6f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a', source: 'MalwareBazaar' } },
    { label: 'Typosquatted phish (domain)', values: { type: 'domain', value: 'login-microsoftonline-secure.com',                  source: 'urlscan.io' } },
    { label: 'Lumma stealer C2 (URL)',      values: { type: 'url',    value: 'https://cdn-update-windows.top/install/setup.exe',  source: 'ThreatFox' } },
    { label: 'BEC sender (email)',          values: { type: 'email',  value: 'ceo.directpay@accountspay-corp.com',                source: 'internal-IR' } },
  ],
  'executive-brief': [
    { label: 'Weekly CISO update (default)', values: {} },
    { label: 'Board readiness snapshot',     values: {} },
    { label: 'Post-incident posture',        values: {} },
    { label: 'M&A due-diligence brief',      values: {} },
    { label: 'Regulator inquiry response',   values: {} },
  ],
  'draft-playbook': [
    {
      label: 'Credential dumping on DC',
      values: {
        trigger: 'EDR detects LSASS access by an unsigned binary on a domain controller (suspected Mimikatz / nanodump).',
        goal: 'Contain the DC, rotate krbtgt twice, preserve memory + disk evidence, hunt lateral movement.',
        constraints: 'least-privilege, auditable, reversible where possible, no off-hours user impact',
      },
    },
    {
      label: 'Ransomware on file server',
      values: {
        trigger: 'EDR mass-rename pattern (>500 files/min, .LOCKED extension) on FILE-SRV-02.',
        goal: 'Isolate host, snapshot for forensics, restore from last known-good backup, scope blast radius.',
        constraints: 'preserve volume shadow copies; coordinate with legal before any ransom contact',
      },
    },
    {
      label: 'Phishing inbox rule abuse',
      values: {
        trigger: 'M365 alert: new inbox rule forwarding all mail externally created from an unusual IP.',
        goal: 'Revoke sessions, reset password, kill rule, search tenant for similar rules, notify user.',
        constraints: 'no user lockout beyond 30 min; preserve message-trace for IR',
      },
    },
    {
      label: 'Public S3 bucket exposure',
      values: {
        trigger: 'AWS Config / Macie flags an S3 bucket with PII as publicly readable.',
        goal: 'Lock down bucket, rotate any leaked creds, assess access logs, file breach-notification if required.',
        constraints: 'do not delete objects; preserve CloudTrail; legal-hold any access-log evidence',
      },
    },
    {
      label: 'Insider data exfil to USB',
      values: {
        trigger: 'DLP alert: 12GB copied to USB by a departing employee in the past hour.',
        goal: 'Freeze account, capture endpoint forensic image, coordinate HR + legal interview, recover device.',
        constraints: 'chain-of-custody mandatory; do not tip off subject; follow internal investigations policy',
      },
    },
  ],
  'shift-handover': [
    { label: 'Day → Night',           values: { outgoing_shift: 'Day (08:00-16:00)' } },
    { label: 'Night → Day',           values: { outgoing_shift: 'Night (00:00-08:00)' } },
    { label: 'Swing → Night',         values: { outgoing_shift: 'Swing (16:00-00:00)' } },
    { label: 'Weekend on-call → Mon', values: { outgoing_shift: 'Weekend on-call (Sat 00:00 - Mon 08:00)' } },
    { label: 'Holiday skeleton crew', values: { outgoing_shift: 'Holiday skeleton (12h, 08:00-20:00)' } },
  ],
  'red-team': [
    { label: 'Phishing → ransomware',     values: { scenario: 'Initial access via phishing leading to ransomware on a Windows file server.',                             environment: 'enterprise: Windows AD + AWS + CrowdStrike EDR' } },
    { label: 'AWS console takeover',      values: { scenario: 'Compromised IAM access keys used to enumerate S3 buckets and create persistence via new IAM user.',         environment: 'AWS multi-account org, GuardDuty enabled' } },
    { label: 'Supply-chain via CI/CD',    values: { scenario: 'Malicious npm package introduced via a dependency-confusion attack on an internal GitHub Actions pipeline.', environment: 'GitHub Enterprise + Actions, npm registry, Node services' } },
    { label: 'Insider exfil to personal', values: { scenario: 'Departing engineer copies source code to personal Google Drive over 2 weeks while still employed.',         environment: 'M365 + GitHub Enterprise; CASB monitored egress' } },
    { label: 'OT/ICS pivot from IT',      values: { scenario: 'Attacker pivots from corporate IT network to OT historian via flat VLAN and weak engineering-workstation credentials.', environment: 'Manufacturing site, Purdue model levels 2-3, Claroty CTD' } },
  ],
  'phishing-classifier': [
    {
      label: 'Spear-phish executive',
      values: {
        email:
          'From: ceo.directpay@accountspay-corp.com\n' +
          'To: cfo@company.com\n' +
          'Subject: Urgent — confidential acquisition wire today\n\n' +
          'I need you to process a confidential wire of $487,200 to the attached account before 4pm.\n' +
          'Do not discuss with the team — this is a sensitive acquisition. I am stuck in board meetings.\n' +
          'Confirm by reply only. — Mike',
      },
    },
    {
      label: 'BEC wire fraud',
      values: {
        email:
          'From: accounts@vendor-pay-corp.com\n' +
          'To: ap@company.com\n' +
          'Subject: Updated banking details for invoice INV-88421\n\n' +
          'Please note our banking details have changed. Update your records and remit outstanding $124,800\n' +
          'to: First National, Routing 091000019, Acct 7741-22-091. Confirm receipt.\n',
      },
    },
    {
      label: 'Credential harvester',
      values: {
        email:
          'From: it-support@microsft-online.com\n' +
          'To: jdoe@company.com\n' +
          'Subject: [Action Required] Your mailbox is 99% full\n\n' +
          'Click here to verify your account and prevent mail loss:\n' +
          'https://login-microsoftonline.support-secure.com/verify?u=jdoe@company.com\n' +
          'Failure to verify within 24h will result in mailbox deletion.\n',
      },
    },
    {
      label: 'Malware lure (invoice .zip)',
      values: {
        email:
          'From: billing@dhl-express-courier.com\n' +
          'To: jdoe@company.com\n' +
          'Subject: DHL Shipment 2841-7720 — delivery failed\n\n' +
          'Your parcel could not be delivered. See attached waybill (waybill_2841-7720.zip) for re-delivery instructions.\n' +
          'Track: http://dhl-courier.express-track.tk/?id=2841-7720\n',
      },
    },
    {
      label: 'Vendor invoice scam',
      values: {
        email:
          'From: invoice-billing@accountspay-corp.com\n' +
          'To: ap@company.com\n' +
          'Subject: Your invoice INV-88421 is overdue (2nd reminder)\n\n' +
          'Your invoice is overdue. To prevent service interruption, pay now via:\n' +
          'https://login-microsoftonline.support-secure.com/redirect?u=invoice-portal\n' +
          'Amount due: $14,820.00 — Net 0 — pay immediately.\n',
      },
    },
  ],
  'policy-diff': [
    {
      label: 'Password policy hardening',
      values: {
        old_policy: 'Passwords must be 8+ chars, mixed case, rotated every 90 days. MFA required for admins. Account lockout after 10 failed attempts.',
        new_policy: 'Passwords must be 12+ chars, no rotation unless compromise suspected. MFA (TOTP/FIDO2) required for all users. Hardware keys required for admins. Lockout after 5 failed attempts.',
      },
    },
    {
      label: 'Acceptable use → BYOD allowed',
      values: {
        old_policy: 'Only company-issued devices may access corporate resources. No personal devices on the corporate network. USB storage disabled by GPO.',
        new_policy: 'Personal devices permitted via MDM-enrolled BYOD program for email/calendar only. USB storage allowed with DLP scanning. Split-tunnel VPN permitted for SaaS-only traffic.',
      },
    },
    {
      label: 'Vendor risk tier rules',
      values: {
        old_policy: 'All vendors must complete SOC 2 attestation annually. Tier-1 vendors require on-site assessment. Penetration test reports required for any vendor handling PII.',
        new_policy: 'SOC 2 OR ISO 27001 accepted. On-site assessment optional for Tier-1 if SOC 2 Type II within 12 months. Pen-test waived for vendors processing <10k PII records/yr.',
      },
    },
    {
      label: 'Incident response SLA change',
      values: {
        old_policy: 'P1 incidents must be acknowledged within 15 minutes 24/7. Containment target 1 hour. Executive notification within 30 min for critical.',
        new_policy: 'P1 acknowledged within 30 minutes business hours, 60 minutes off-hours. Containment target 4 hours. Executive notification only after confirmed scope (no early speculative pages).',
      },
    },
    {
      label: 'Data retention shortened',
      values: {
        old_policy: 'Endpoint logs retained 365 days. Network flow logs 180 days. Email retention 7 years per legal hold. SIEM hot-tier 90 days.',
        new_policy: 'Endpoint logs 90 days hot / 180 cold. Network flow 30 days. Email retention 3 years default (legal hold exceptions). SIEM hot-tier 30 days.',
      },
    },
  ],
  'mitre-mapper': [
    { label: 'PowerShell + scheduled task',  values: { ttp_text: 'Adversary used PowerShell to download a payload from a typosquatted CDN and added a scheduled task for persistence. Disabled Defender via registry.' } },
    { label: 'Kerberoasting + lateral RDP',  values: { ttp_text: 'Attacker requested service tickets (RC4) for multiple SPNs, cracked offline, then RDP into a domain controller using a recovered service-account password.' } },
    { label: 'Phishing → OAuth consent',     values: { ttp_text: 'User received a phishing email and granted consent to a malicious Azure AD app with Mail.Read and Files.Read.All scopes. Attacker then exfiltrated mailbox content via Graph API.' } },
    { label: 'Living-off-the-land transfer', values: { ttp_text: 'Attacker used certutil.exe -urlcache to fetch a payload and bitsadmin to maintain a download job for persistence. PsExec used for lateral movement.' } },
    { label: 'Cloud key compromise',         values: { ttp_text: 'Leaked AWS access key used from a Tor exit node to call sts:GetCallerIdentity, ListBuckets, then CreateUser and AttachUserPolicy AdministratorAccess for persistence.' } },
  ],
  'compromise-assess': [
    { label: 'File server (ransomware suspicion)', values: { asset_hostname: 'FILE-SRV-02',   asset_notes: 'Windows Server 2019 critical file server. EDR flagged mass-rename pattern (>500 files/min, .LOCKED ext) 14 min ago. Backups last verified 6h ago.' } },
    { label: 'Domain controller (LSASS access)',   values: { asset_hostname: 'DC01-EAST',     asset_notes: 'Primary DC, Server 2022. CrowdStrike alerted unsigned binary touched LSASS. Coincides with admin login from a non-standard workstation.' } },
    { label: 'Executive laptop (phishing click)',  values: { asset_hostname: 'LT-CFO-WONG',   asset_notes: 'CFO Macbook. User clicked a credential-harvester link 2h ago. Subsequent unusual sign-in from a new ASN (Lagos, NG).' } },
    { label: 'Linux web server (exposed RCE)',     values: { asset_hostname: 'WEB-DMZ-07',    asset_notes: 'Public-facing Ubuntu 22.04 nginx + custom app. Vuln scanner found CVE-2024-3094 (xz-utils backdoor) lib present; no patch yet. WAF logs show probing.' } },
    { label: 'Jump host (anomalous tunneling)',    values: { asset_hostname: 'JUMP-OPS-01',   asset_notes: 'Engineering jump host. Netflow shows steady 50KB/s outbound to 185.220.101.45 over port 443 for last 8h. No business reason known.' } },
  ],
  'remediation-estimator': [
    { label: 'Cobalt Strike beacon',     values: { incident_title: 'Cobalt Strike beacon on finance-vm-09', incident_severity: 'critical', incident_notes: 'Detected via EDR; finance VM; user p.kim. Beacon resolved to 185.220.101.45 (known Tor exit). Estimated dwell time 5 days from initial PowerShell child of WINWORD.EXE.' } },
    { label: 'Ransomware on file server', values: { incident_title: 'Ransomware encryption on FILE-SRV-02', incident_severity: 'critical', incident_notes: '~840k files encrypted (.LOCKED). Backups intact (last 6h). Ransom note left. No exfil evidence yet. 12 shares affected across 3 departments.' } },
    { label: 'BEC wire fraud',            values: { incident_title: 'BEC wire fraud $487k to attacker bank',  incident_severity: 'high',    incident_notes: 'CFO approved wire after spoofed CEO email. Funds left bank 2h ago. Working with FBI IC3 + bank fraud team. Need legal, comms, insurance involved.' } },
    { label: 'Public S3 bucket leak',     values: { incident_title: 'Public S3 bucket exposed 280k PII records', incident_severity: 'high', incident_notes: 'Customer-records-prod bucket had public-read ACL for 11 days. Access logs show ~14 unique IPs downloaded objects. GDPR + CCPA notification windows in play.' } },
    { label: 'Insider source-code exfil', values: { incident_title: 'Departing engineer exfiltrated 12GB source', incident_severity: 'medium', incident_notes: 'DLP caught USB copy. HR + legal engaged. Need device forensics, NDA-enforcement plan, partial repo rotation/secret rotation, customer-impact assessment.' } },
  ],
  'log-anomaly': [
    { label: 'Failed-login + egress + DNS',  values: { log_window: 'auth: 532 failed logins for jdoe in 30m; egress: 4.2GB to 185.220.101.45 over :443; dns: 1422 NXDOMAIN to *.tk in 1h' } },
    { label: 'Off-hours admin activity',     values: { log_window: 'auth: domain-admin sa-svc-backup login from new ASN at 03:12 UTC; subsequent secretsmanager:GetSecretValue x47 in 90s; CloudTrail: CreateUser "support-helper" with AdministratorAccess' } },
    { label: 'Kerberoast burst',             values: { log_window: 'Windows 4769: 187 TGS-REQ (RC4 0x17) for 12 SPNs from WS-MKT-44 in 6min; user b.harris; no prior 4769 history from this host' } },
    { label: 'Beacon timing pattern',        values: { log_window: 'proxy: 1.2KB POST to api-update[.]workers[.]dev every 60.3s ± 2s from LT-CFO-WONG over 4h; jitter consistent with C2; UA "curl/7.81.0"' } },
    { label: 'Mass file-rename (ransomware)', values: { log_window: 'EDR: process explorer.exe(?) renamed 18,400 files in 6min on FILE-SRV-02 (.LOCKED extension); vss-admin delete shadows /all executed at 14:02:11Z; service "VSS" stopped' } },
  ],
  'identity-risk': [
    { label: 'Finance admin, impossible travel', values: { user_id: 'm.chen',   user_notes: 'roles: finance-admin, azure-sub-owner; mfa: sms; recent: impossible_travel (NYC→Moscow in 38min), 24 MFA pushes accepted in 5 min last night' } },
    { label: 'Service account misused',          values: { user_id: 'svc-backup', user_notes: 'service account with Domain Admin (legacy); interactive login from workstation WS-MKT-44 at 03:12 UTC; no MFA; password unchanged 4 years' } },
    { label: 'Privileged dev, GitHub leak',      values: { user_id: 'a.patel',  user_notes: 'roles: github-org-owner, prod-deploy; recent: personal access token committed to public repo 6h ago; subsequent login from new ASN; downloaded 32 repos' } },
    { label: 'New joiner, anomalous access',     values: { user_id: 'n.singh',  user_notes: 'role: marketing-coordinator (3 days in role); accessed HR-PII share + finance-budgets share within first 48h; not in approved RBAC for either' } },
    { label: 'Departing exec, USB exfil',        values: { user_id: 'r.kowalski', user_notes: 'roles: vp-product (resignation effective in 12 days); DLP: 12GB copied to USB last hour; legal hold pending; recent printer-spool spike to 600 pages' } },
  ],
  'supply-chain-scan': [
    { label: 'Small biller, no SOC 2',          values: { vendor_name: 'Acme Legacy Bills Inc.',     vendor_notes: 'tier: low; no SOC 2; processes invoices and limited PII; 1-person shop; uses shared QuickBooks Online' } },
    { label: 'Payroll SaaS, Tier-1',            values: { vendor_name: 'PayrollHub Cloud',           vendor_notes: 'tier: critical; SOC 2 Type II current; processes SSNs + bank info for 18k employees; recent breach disclosure 2024-Q3 affecting peer customer' } },
    { label: 'Open-source build dependency',    values: { vendor_name: 'OSS: xz-utils (transitive)', vendor_notes: 'transitive dep of libssh-build-tools; CVE-2024-3094 backdoor in 5.6.0/5.6.1; consumed via base container image org-build-base:2024.04' } },
    { label: 'MSP with network access',         values: { vendor_name: 'NorthBridge MSP',            vendor_notes: 'tier: high; has VPN + admin access to 40 servers for backup mgmt; no SOC 2; ransomware affected 2 of their other clients in past 6mo' } },
    { label: 'AI-feature subprocessor',         values: { vendor_name: 'OpenRouter (LLM gateway)',   vendor_notes: 'tier: medium; routes user prompts to multiple model providers; data-retention TBD; SOC 2 in progress; used by 3 internal AI features touching customer text' } },
  ],
  'breach-narrative': [
    { label: 'Ransomware on file server',     values: { incident_title: 'Suspected ransomware on FILE-SRV-02',         incident_notes: 'Detected via EDR mass-rename pattern at 14:02 UTC. ~840k files encrypted, .LOCKED extension. Backups intact (last 6h). No exfil evidence yet. 12 shares across 3 departments. Containment achieved within 38 min.' } },
    { label: 'BEC wire fraud',                values: { incident_title: 'BEC wire fraud incident — $487k loss',         incident_notes: 'CFO approved a $487,200 wire after a spoofed-CEO email. Funds left the originating bank ~2h prior to detection. FBI IC3 report filed. Working with bank fraud team; partial clawback possible. No system compromise.' } },
    { label: 'Cloud bucket exposure',         values: { incident_title: 'Public S3 bucket exposed 280k PII records',    incident_notes: 'customer-records-prod bucket had public-read ACL for 11 days due to a Terraform misconfig. Access logs show ~14 distinct IPs downloaded objects. GDPR + CCPA notification windows in play. Bucket re-secured; data-subject impact analysis in progress.' } },
    { label: 'Vendor breach blast radius',    values: { incident_title: 'Vendor PayrollHub Cloud breach — our exposure', incident_notes: 'Vendor disclosed unauthorized access to their prod DB on 2024-09-12. Confirmed 18k of our employee SSNs + bank details in their scope. No direct intrusion into our systems. Notifying employees + offering 24mo identity-protection.' } },
    { label: 'Insider source-code exfil',     values: { incident_title: 'Departing engineer exfiltrated 12GB of source', incident_notes: 'DLP caught a 12GB USB copy by a resigning engineer the day prior to their last day. Device recovered + forensically imaged. Legal + HR engaged; cease-and-desist sent. Secret-rotation + partial repo scope assessment underway.' } },
  ],
  // Pass 7 — mechanical backlog
  'false-positive-reducer': [
    { label: 'Noisy AV detection on dev box', values: { alert_title: 'AV: Win32/Suspicious.Generic on DEV-BUILD-09', alert_notes: 'Flagged build artifact in C:\\agent\\_work. Same artifact + hash quarantined 12 times this month on same build host. No process injection observed. Defender Cloud confidence: low.' } },
    { label: 'Beacon-like jitter to NTP',     values: { alert_title: 'Suspected C2 beacon LT-CFO-WONG → time.windows.com', alert_notes: 'Proxy logs: regular 64-byte UDP/123 every 64s. Asset is a Win11 laptop. Destination is Microsoft NTP. Matches W32Time service interval.' } },
    { label: 'IDS rule fires on vuln scan',   values: { alert_title: 'Snort: SQL injection probe from 10.20.4.18', alert_notes: 'Source 10.20.4.18 is registered Qualys scanner. Scheduled scan window 02:00-04:00 UTC daily. Same rule fires ~400x/day from this IP. No corresponding app logs.' } },
    { label: 'Failed-login burst, MFA OK',    values: { alert_title: 'Brute force: 87 failed logins for jdoe', alert_notes: 'Auth source: Entra ID. All 87 failures from the same iOS device with stale cached password after rotation. Subsequent success with MFA. No geo anomaly.' } },
    { label: 'EDR detected admin tool',       values: { alert_title: 'EDR: PsExec.exe launched on SRV-DB-04', alert_notes: 'PsExec invoked by approved sysadmin a.singh from jump host JUMP-OPS-01. Tied to CR-2024-0814 change window. Signed binary, expected workflow.' } },
  ],
  'playbook-recommend': [
    { label: 'Ransomware on file server',     values: { incident_title: 'Suspected ransomware on FILE-SRV-02', incident_notes: 'EDR mass-rename pattern 14:02 UTC, .LOCKED extension, ~840k files. Backups intact (last 6h). 12 shares affected.' } },
    { label: 'BEC wire fraud',                values: { incident_title: 'BEC wire fraud $487k to attacker bank', incident_notes: 'CFO approved spoofed-CEO wire 2h ago. FBI IC3 filed. Bank fraud team engaged. No system compromise.' } },
    { label: 'Phishing click + cred harvest', values: { incident_title: 'CFO clicked credential harvester', incident_notes: 'LT-CFO-WONG; user submitted password on cloned M365 portal. Subsequent sign-in from new ASN (Lagos, NG) 14 min ago.' } },
    { label: 'Public S3 exposure',            values: { incident_title: 'Public S3 bucket exposed 280k PII', incident_notes: 'customer-records-prod public-read for 11d. 14 unique IPs downloaded objects. GDPR window in play.' } },
    { label: 'Kerberoasting burst',           values: { incident_title: 'Kerberoasting on AD from WS-MKT-44', incident_notes: '187 TGS-REQ RC4 0x17 for 12 SPNs in 6 min from one workstation. No prior 4769 from this host.' } },
  ],
  'post-incident-report': [
    { label: 'Ransomware on FILE-SRV-02',     values: { incident_title: 'Ransomware on FILE-SRV-02 — final report',  timeline_notes: '14:02 EDR mass-rename detected; 14:08 host isolated; 14:21 IR lead engaged; 14:40 backups verified; 16:05 restoration started; 22:30 prod restored from 14:00 snapshot. RCA: stale legacy SMB share, no MFA on service account, no allowlisting on file server.' } },
    { label: 'BEC wire fraud report',         values: { incident_title: 'BEC wire fraud $487k — full report',         timeline_notes: '09:41 CFO received spoofed-CEO email; 10:55 wire approved; 11:02 wire sent; 13:18 detected when real CEO denied request; 13:25 FBI IC3 filed; 13:40 bank notified, clawback initiated; partial recovery $312k by D+4. RCA: no out-of-band verification policy, look-alike domain not blocked.' } },
    { label: 'S3 exposure RCA',               values: { incident_title: 'Public S3 bucket exposure — RCA + actions',  timeline_notes: 'Bucket created via Terraform 2024-09-01 with public-read for "convenience". Macie alert 2024-09-12. 14 distinct IPs downloaded. Bucket re-secured 2024-09-12 18:40. RCA: Terraform PR not reviewed by security; no S3 BlockPublicAccess org policy.' } },
    { label: 'Phishing → OAuth consent',      values: { incident_title: 'OAuth consent abuse on M365 — lessons',     timeline_notes: 'User granted consent to malicious 3rd-party app with Mail.Read scope. Attacker exfil 2 GB mailbox over 6h before MDA alert. Consent revoked, app blocked tenant-wide, user reset. RCA: admin-consent workflow not enabled, scope risk not surfaced to user.' } },
    { label: 'Insider exfil report',          values: { incident_title: 'Insider source-code exfil — RCA + remediation', timeline_notes: 'DLP caught 12GB USB copy by departing engineer 23:48. Device recovered + imaged. Legal C&D issued. Secret rotation completed for 14 repos. RCA: USB write not blocked for offboarding users; no DLP on personal cloud sync.' } },
  ],
  'log-query-copilot': [
    { label: 'Find PowerShell downloading from typosquats', values: { intent: 'Find PowerShell processes downloading from typosquatted Microsoft domains in the last 24h on Windows endpoints.', platform: 'splunk' } },
    { label: 'AWS console logins from Tor',                 values: { intent: 'Show AWS console logins originating from Tor exit nodes in the last 7 days.', platform: 'sentinel' } },
    { label: 'Mass file rename (ransomware)',               values: { intent: 'Detect a single process renaming more than 200 files in 5 minutes on a file server.', platform: 'elastic' } },
    { label: 'OAuth consent grants to risky apps',          values: { intent: 'Find users who granted OAuth consent to non-verified Azure AD apps with Mail.Read or Files.Read.All scopes.', platform: 'sentinel' } },
    { label: 'Beaconing C2 timing',                         values: { intent: 'Identify outbound HTTP POST requests with consistent 60-second jitter from a single workstation over the past 4 hours.', platform: 'sigma' } },
  ],
  'tabletop-exercise': [
    { label: 'Ransomware on file server',  values: { threat_profile: 'Ransomware (Conti-like) encrypts FILE-SRV-02 during business hours; backups partially impacted', audience: 'SOC L1/L2, IR lead, IT ops, legal, comms', duration_minutes: 90 } },
    { label: 'Cloud key compromise',       values: { threat_profile: 'AWS access key for prod deploy IAM user leaked via GitHub; attacker enumerates S3 and creates persistence IAM user', audience: 'SOC, cloud engineering, IR lead, CISO', duration_minutes: 75 } },
    { label: 'BEC wire fraud',             values: { threat_profile: 'CFO receives a convincing spoofed-CEO email approving $480k acquisition wire; funds leave the bank before detection', audience: 'SOC, IR, finance, legal, exec leadership', duration_minutes: 60 } },
    { label: 'Insider data exfil',         values: { threat_profile: 'Departing senior engineer copies 12GB of source code to USB then to personal cloud over their final 2 weeks', audience: 'SOC, insider risk, HR, legal, eng leadership', duration_minutes: 90 } },
    { label: 'OT/ICS pivot from IT',       values: { threat_profile: 'Attacker pivots from corp IT to OT historian via flat VLAN, then attempts engineering-workstation access at manufacturing plant', audience: 'SOC, OT security, plant ops, IR lead, CISO', duration_minutes: 120 } },
  ],
};

// GET /api/ai/samples?feature=phishing-classifier
// Returns { samples: [{label, values:{fieldName: value, ...}}, ...] }
// Field names match the inputs[].name of the matching frontend page.
router.get('/samples', (req, res) => {
  const feature = String(req.query.feature || '').trim();
  if (!feature) return res.status(400).json({ error: 'feature query param required' });
  const samples = SAMPLES[feature];
  if (!samples) return res.status(404).json({ error: `no samples for feature "${feature}"` });
  res.json({ feature, samples });
});

// GET /api/ai/history?feature=triage-alerts&limit=20
router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const params = [];
    let where = '';
    if (feature) {
      params.push(feature);
      where = `WHERE feature = $1`;
    }
    const sql = `SELECT id, feature, input, result, created_by, created_at
                 FROM ai_results ${where}
                 ORDER BY created_at DESC LIMIT ${limit}`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 1: Triage alerts (uses open alerts from DB)
router.post('/triage-alerts', async (req, res) => {
  try {
    let alerts = req.body.alerts;
    if (!Array.isArray(alerts) || alerts.length === 0) {
      const r = await pool.query(
        `SELECT alert_id, source, severity, title, status, asset, created_at
         FROM alerts WHERE status IN ('open','investigating') ORDER BY created_at DESC LIMIT 25`
      );
      alerts = r.rows;
    }
    const out = await ai.triageAlerts(alerts);
    await record('triage-alerts', { count: alerts.length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 2: Build hunt
router.post('/build-hunt', async (req, res) => {
  try {
    const { hypothesis, environment, data_sources } = req.body || {};
    const input = {
      hypothesis: hypothesis || 'Adversary is using DNS tunneling for C2 from a corporate workstation.',
      environment,
      data_sources,
    };
    const out = await ai.buildHunt(input);
    await record('build-hunt', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 3: Enrich IOC
router.post('/enrich-ioc', async (req, res) => {
  try {
    let ioc = req.body.ioc;
    if (!ioc) {
      const r = await pool.query(
        `SELECT type, value, source, first_seen FROM iocs ORDER BY first_seen DESC LIMIT 1`
      );
      ioc = r.rows[0] || { type: 'ipv4', value: '203.0.113.45', source: 'demo' };
    }
    const out = await ai.enrichIoc(ioc);
    await record('enrich-ioc', { ioc }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 4: Executive brief
router.post('/executive-brief', async (req, res) => {
  try {
    const [alerts, incidents, iocs, assets] = await Promise.all([
      pool.query(`SELECT severity, status, COUNT(*)::int AS n FROM alerts GROUP BY severity, status`),
      pool.query(`SELECT severity, status, COUNT(*)::int AS n FROM incidents GROUP BY severity, status`),
      pool.query(`SELECT type, COUNT(*)::int AS n FROM iocs GROUP BY type`),
      pool.query(`SELECT criticality, COUNT(*)::int AS n FROM assets GROUP BY criticality`),
    ]);
    const stats = {
      alerts_by_severity_status: alerts.rows,
      incidents_by_severity_status: incidents.rows,
      iocs_by_type: iocs.rows,
      assets_by_criticality: assets.rows,
      generated_at: new Date().toISOString(),
    };
    const out = await ai.executiveBrief(stats);
    const payload = { stats, ...out };
    await record('executive-brief', { stats_keys: Object.keys(stats) }, payload, actorOf(req), userIdOf(req));
    res.json(payload);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 5: Draft playbook
router.post('/draft-playbook', async (req, res) => {
  try {
    const { trigger, goal, constraints } = req.body || {};
    const input = {
      trigger: trigger || 'EDR detects credential dumping on a domain controller',
      goal: goal || 'Contain the host, rotate impacted credentials, and preserve forensic evidence',
      constraints,
    };
    const out = await ai.draftPlaybook(input);
    await record('draft-playbook', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 6: Shift handover
router.post('/shift-handover', async (req, res) => {
  try {
    const [incidents, alerts, iocs] = await Promise.all([
      pool.query(`SELECT incident_id, title, severity, status, assignee FROM incidents WHERE status NOT IN ('closed','resolved') ORDER BY opened_at DESC LIMIT 15`),
      pool.query(`SELECT alert_id, title, severity, status, asset FROM alerts WHERE status IN ('open','investigating') ORDER BY created_at DESC LIMIT 15`),
      pool.query(`SELECT type, value FROM iocs WHERE confidence >= 0.7 ORDER BY first_seen DESC LIMIT 10`),
    ]);
    const input = {
      outgoing_shift: req.body?.outgoing_shift || 'Day (08:00-16:00)',
      open_incidents: incidents.rows,
      open_alerts: alerts.rows,
      watchlist: iocs.rows,
    };
    const out = await ai.shiftHandover(input);
    await record('shift-handover', { outgoing_shift: input.outgoing_shift }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 10 NEW AI VERBS
// ============================================================

// AI 7: Red team
router.post('/red-team', async (req, res) => {
  try {
    const input = {
      scenario: req.body?.scenario || 'Initial access via phishing leading to ransomware on a Windows file server',
      environment: req.body?.environment,
    };
    const out = await ai.redTeam(input);
    await record('red-team', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 8: Phishing classifier
router.post('/phishing-classifier', async (req, res) => {
  try {
    const input = { email: req.body?.email || 'From: invoice-billing@accountspay-corp.com\nSubject: Your invoice is overdue\nClick: https://login-microsoftonline.support-secure.com/redirect' };
    const out = await ai.phishingClassifier(input);
    await record('phishing-classifier', { email_size: String(input.email).length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 9: Policy diff
router.post('/policy-diff', async (req, res) => {
  try {
    const input = {
      old_policy: req.body?.old_policy || 'Passwords must be 8+ chars, rotated every 90 days. MFA required for admins.',
      new_policy: req.body?.new_policy || 'Passwords must be 12+ chars. MFA required for all users. Hardware keys for admins.',
    };
    const out = await ai.policyDiff(input);
    await record('policy-diff', { old_len: input.old_policy.length, new_len: input.new_policy.length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 10: MITRE mapper
router.post('/mitre-mapper', async (req, res) => {
  try {
    const input = { ttp_text: req.body?.ttp_text || 'Adversary used PowerShell to download a payload from a typosquatted CDN and added a scheduled task for persistence.' };
    const out = await ai.mitreMapper(input);
    await record('mitre-mapper', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 11: Compromise assess
router.post('/compromise-assess', async (req, res) => {
  try {
    let asset = req.body?.asset;
    if (!asset) {
      const r = await pool.query(`SELECT asset_id, hostname, ip, os, owner, criticality FROM assets ORDER BY criticality DESC LIMIT 1`);
      asset = r.rows[0] || { hostname: 'file-srv-02', criticality: 'critical' };
    }
    const out = await ai.compromiseAssess({ asset });
    await record('compromise-assess', { asset }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 12: Remediation estimator
router.post('/remediation-estimator', async (req, res) => {
  try {
    let incident = req.body?.incident;
    if (!incident) {
      const r = await pool.query(`SELECT incident_id, title, severity, status, assignee FROM incidents WHERE status NOT IN ('closed','resolved') ORDER BY opened_at DESC LIMIT 1`);
      incident = r.rows[0] || { title: 'Cobalt Strike beacon on finance-vm-09', severity: 'critical' };
    }
    const out = await ai.remediationEstimator({ incident });
    await record('remediation-estimator', { incident }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 13: Log anomaly
router.post('/log-anomaly', async (req, res) => {
  try {
    const input = { log_window: req.body?.log_window || 'auth: 532 failed logins for jdoe in 30m; egress: 4.2GB to 185.220.101.45; dns: 1422 NXDOMAIN to *.tk' };
    const out = await ai.logAnomaly(input);
    await record('log-anomaly', { window_size: String(input.log_window).length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 14: Identity risk
router.post('/identity-risk', async (req, res) => {
  try {
    const input = { user: req.body?.user || { id: 'm.chen', roles: ['finance-admin','azure-sub-owner'], last_login_geo: 'RU', mfa_method: 'sms', recent_anomalies: ['impossible_travel','24_mfa_pushes'] } };
    const out = await ai.identityRisk(input);
    await record('identity-risk', { user_id: input.user?.id || 'unknown' }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 15: Supply chain
router.post('/supply-chain-scan', async (req, res) => {
  try {
    let vendor = req.body?.vendor;
    if (!vendor) {
      const r = await pool.query(`SELECT vendor_id, name, tier, soc2, risk_score, status FROM vendor_risk ORDER BY risk_score DESC LIMIT 1`);
      vendor = r.rows[0] || { name: 'Acme Legacy Bills Inc.', risk_score: 78 };
    }
    const out = await ai.supplyChainScan({ vendor });
    await record('supply-chain-scan', { vendor }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 16: Breach narrative
router.post('/breach-narrative', async (req, res) => {
  try {
    let incident = req.body?.incident;
    if (!incident) {
      const r = await pool.query(`SELECT incident_id, title, severity, status, assignee FROM incidents WHERE severity='critical' ORDER BY opened_at DESC LIMIT 1`);
      incident = r.rows[0] || { title: 'Suspected ransomware on file server FILE-SRV-02', severity: 'critical' };
    }
    const out = await ai.breachNarrative({ incident });
    await record('breach-narrative', { incident }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PASS 7 — 5 new mechanical AI verbs (backlog)
// ============================================================

// AI 17: False-positive reducer
router.post('/false-positive-reducer', async (req, res) => {
  try {
    let alert = req.body?.alert;
    const { alert_title, alert_notes } = req.body || {};
    if (!alert && (alert_title || alert_notes)) {
      alert = { title: alert_title, notes: alert_notes };
    }
    if (!alert) {
      const r = await pool.query(
        `SELECT alert_id, source, severity, title, status, asset, created_at
         FROM alerts WHERE status IN ('open','investigating') ORDER BY created_at DESC LIMIT 1`
      );
      alert = r.rows[0] || { title: 'AV: Win32/Suspicious.Generic on DEV-BUILD-09', notes: 'Repeated quarantine on same build artifact.' };
    }
    let history = req.body?.history;
    if (!Array.isArray(history)) {
      try {
        const h = await pool.query(
          `SELECT alert_id, title, severity, status, created_at FROM alerts
           WHERE title ILIKE $1 ORDER BY created_at DESC LIMIT 10`,
          [`%${String(alert.title || '').slice(0, 40)}%`]
        );
        history = h.rows;
      } catch (_) { history = []; }
    }
    const out = await ai.falsePositiveReducer({ alert, history });
    await record('false-positive-reducer', { alert, history_count: (history || []).length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 18: Playbook recommender (ranks EXISTING playbooks against incident)
router.post('/playbook-recommend', async (req, res) => {
  try {
    let incident = req.body?.incident;
    const { incident_title, incident_notes } = req.body || {};
    if (!incident && (incident_title || incident_notes)) {
      incident = { title: incident_title, notes: incident_notes };
    }
    if (!incident) {
      const r = await pool.query(
        `SELECT incident_id, title, severity, status, assignee FROM incidents
         WHERE status NOT IN ('closed','resolved') ORDER BY opened_at DESC LIMIT 1`
      );
      incident = r.rows[0] || { title: 'Suspected ransomware on FILE-SRV-02', severity: 'critical' };
    }
    let playbooks = req.body?.playbooks;
    if (!Array.isArray(playbooks)) {
      const r = await pool.query(`SELECT * FROM playbooks ORDER BY id ASC LIMIT 50`);
      playbooks = r.rows;
    }
    const out = await ai.playbookRecommend({ incident, playbooks });
    await record('playbook-recommend', { incident, playbook_count: playbooks.length }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 19: Post-incident report
router.post('/post-incident-report', async (req, res) => {
  try {
    let incident = req.body?.incident;
    const { incident_title, timeline_notes } = req.body || {};
    if (!incident && incident_title) {
      incident = { title: incident_title };
    }
    if (!incident) {
      const r = await pool.query(
        `SELECT incident_id, title, severity, status, assignee, opened_at FROM incidents
         ORDER BY opened_at DESC LIMIT 1`
      );
      incident = r.rows[0] || { title: 'Ransomware on FILE-SRV-02', severity: 'critical' };
    }
    const timeline = req.body?.timeline || timeline_notes || 'detected via EDR; isolated host within 6 min; restored from backup within 8h';
    const out = await ai.postIncidentReport({ incident, timeline });
    await record('post-incident-report', { incident }, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 20: Log query co-pilot
router.post('/log-query-copilot', async (req, res) => {
  try {
    const input = {
      intent: req.body?.intent || 'Find PowerShell processes downloading from typosquatted Microsoft domains in the last 24h.',
      platform: req.body?.platform || 'any',
      schema_hints: req.body?.schema_hints,
    };
    const out = await ai.logQueryCopilot(input);
    await record('log-query-copilot', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 21: Tabletop exercise generator
router.post('/tabletop-exercise', async (req, res) => {
  try {
    const input = {
      threat_profile: req.body?.threat_profile || 'Ransomware (Conti-like) encrypts FILE-SRV-02 during business hours',
      audience: req.body?.audience || 'SOC L1/L2, IR lead, IT ops, legal, comms',
      duration_minutes: parseInt(req.body?.duration_minutes, 10) || 90,
    };
    const out = await ai.tabletopExercise(input);
    await record('tabletop-exercise', input, out, actorOf(req), userIdOf(req));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
