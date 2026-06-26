# Feature Expansion Plan

Target product: Cybersecurity SOC Copilot

## 1. Alert Ingestion
- Add connectors for SIEM, EDR, email, webhook, CSV, and manual alert intake.
- Backend tables: `alert_sources`, `alert_ingestion_events`, `normalized_alerts`.
- UI entry points: Alerts, Integrations.

## 2. AI Triage
- Score severity, reduce false positives, classify alert type, and suggest analyst action.
- Backend tables: `ai_triage_runs`, `triage_findings`, `triage_recommendations`.
- UI entry points: AI Triage, Alerts.

## 3. Incident Timeline
- Build event timeline from alerts, comments, evidence, enrichment, and remediation steps.
- Backend tables: `incident_timeline_events`, `incident_evidence`.
- UI entry points: Incidents, Post-Incident Report.

## 4. Threat Enrichment
- Enrich IPs, domains, hashes, users, hosts, and MITRE techniques.
- Backend tables: `threat_enrichment_results`, `ioc_reputation`, `mitre_mappings`.
- UI entry points: IOCs, Threat Intel Feed.

## 5. Remediation Playbooks
- Add recommended steps, required approvals, rollback notes, and validation checks.
- Backend tables: `remediation_playbooks`, `playbook_steps`, `playbook_runs`.
- UI entry points: Playbooks, Runbooks.

## 6. Ticket Creation
- Create Jira, ServiceNow, PagerDuty, Linear, or internal tickets from incidents.
- Backend tables: `ticket_integrations`, `ticket_sync_events`.
- UI entry points: Integrations, On-Call.

## 7. Compliance Reporting
- Generate SOC2, ISO, PCI, HIPAA security evidence and incident reporting packages.
- Backend tables: `compliance_reports`, `security_evidence_items`.
- UI entry points: Evidence Library, Reports.

## 8. Analyst Performance Dashboard
- Track alert handling time, false positives, escalation rate, SLA misses, and incident closure quality.
- Backend views: `analyst_performance_metrics`, `soc_sla_metrics`.
- UI entry points: Dashboard, Shift Roster.
