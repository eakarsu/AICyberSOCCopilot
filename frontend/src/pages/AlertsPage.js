import React from 'react';
import CrudPage from '../components/CrudPage';
import { alertsApi } from '../services/api';

const fields = [
  { name: 'alert_id',    label: 'Alert ID',  kind: 'text',     hideInForm: false },
  { name: 'source',      label: 'Source',    kind: 'text' },
  { name: 'severity',    label: 'Severity',  kind: 'severity' },
  { name: 'title',       label: 'Title',     kind: 'truncate', required: true },
  { name: 'status',      label: 'Status',    kind: 'status',   options: ['open','investigating','closed'] },
  { name: 'asset',       label: 'Asset',     kind: 'text' },
  { name: 'created_at',  label: 'Created',   kind: 'datetime', hideInForm: true },
  { name: 'id',          label: '#',         kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { alert_id: '', source: '', severity: 'medium', title: '', status: 'open', asset: '' };

export default function AlertsPage() {
  return (
    <CrudPage
      title="Alerts"
      description="SIEM / EDR / IDS / cloud detections ready for SOC triage."
      api={alertsApi}
      fields={fields}
      emptyRow={emptyRow}
      attachmentCollection="alerts"
    />
  );
}
