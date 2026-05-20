import React from 'react';
import CrudPage from '../components/CrudPage';
import { incidentsApi } from '../services/api';

const fields = [
  { name: 'incident_id',       label: 'Incident ID', kind: 'text' },
  { name: 'title',             label: 'Title',       kind: 'truncate', required: true },
  { name: 'severity',          label: 'Severity',    kind: 'severity' },
  { name: 'status',            label: 'Status',      kind: 'status',   options: ['open','in_progress','resolved','closed'] },
  { name: 'assignee',          label: 'Assignee',    kind: 'text' },
  { name: 'sla_breach_in_min', label: 'SLA (min)',   kind: 'number' },
  { name: 'opened_at',         label: 'Opened',      kind: 'datetime', hideInForm: true },
  { name: 'id',                label: '#',           kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { incident_id: '', title: '', severity: 'medium', status: 'open', assignee: '', sla_breach_in_min: 240 };

export default function IncidentsPage() {
  return (
    <CrudPage
      title="Incidents"
      description="Active SOC investigations with severity, owner, and SLA budget."
      api={incidentsApi}
      fields={fields}
      emptyRow={emptyRow}
      attachmentCollection="incidents"
    />
  );
}
