import React from 'react';
import CrudPage from '../components/CrudPage';
import { blocklistsApi } from '../services/api';

const fields = [
  { name: 'entry_id', label: 'ID',       kind: 'text' },
  { name: 'type',     label: 'Type',     kind: 'status', options: ['ip','domain','hash'] },
  { name: 'value',    label: 'Value',    kind: 'truncate', required: true },
  { name: 'source',   label: 'Source',   kind: 'text' },
  { name: 'severity', label: 'Severity', kind: 'severity' },
  { name: 'added_at', label: 'Added',    kind: 'datetime', hideInForm: true },
  { name: 'status',   label: 'Status',   kind: 'status',   options: ['active','expired'] },
  { name: 'id',       label: '#',        kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { entry_id: '', type: 'ip', value: '', source: '', severity: 'medium', status: 'active' };

export default function BlocklistsPage() {
  return (
    <CrudPage
      title="Blocklists"
      description="Denylist entries pushed to perimeter / EDR / DNS controls."
      api={blocklistsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
