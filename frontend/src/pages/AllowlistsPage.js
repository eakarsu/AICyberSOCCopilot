import React from 'react';
import CrudPage from '../components/CrudPage';
import { allowlistsApi } from '../services/api';

const fields = [
  { name: 'entry_id',      label: 'ID',           kind: 'text' },
  { name: 'type',          label: 'Type',         kind: 'status', options: ['ip','domain','hash'] },
  { name: 'value',         label: 'Value',        kind: 'truncate', required: true },
  { name: 'scope',         label: 'Scope',        kind: 'text' },
  { name: 'justification', label: 'Justification',kind: 'textarea' },
  { name: 'added_by',      label: 'Added By',     kind: 'text' },
  { name: 'expires_at',    label: 'Expires',      kind: 'datetime' },
  { name: 'id',            label: '#',            kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { entry_id: '', type: 'ip', value: '', scope: '', justification: '', added_by: '', expires_at: '' };

export default function AllowlistsPage() {
  return (
    <CrudPage
      title="Allowlists"
      description="Approved IP / domain / hash entries with justification and expiry."
      api={allowlistsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
