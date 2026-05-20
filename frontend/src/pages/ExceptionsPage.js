import React from 'react';
import CrudPage from '../components/CrudPage';
import { exceptionsApi } from '../services/api';

const fields = [
  { name: 'exception_id',  label: 'ID',           kind: 'text' },
  { name: 'control',       label: 'Control',      kind: 'text', required: true },
  { name: 'owner',         label: 'Owner',        kind: 'text' },
  { name: 'justification', label: 'Justification',kind: 'textarea' },
  { name: 'expires_at',    label: 'Expires',      kind: 'datetime' },
  { name: 'status',        label: 'Status',       kind: 'status', options: ['active','expired'] },
  { name: 'id',            label: '#',            kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { exception_id: '', control: '', owner: '', justification: '', expires_at: '', status: 'active' };

export default function ExceptionsPage() {
  return (
    <CrudPage
      title="Exceptions"
      description="Documented control deviations with owner, justification, and expiry."
      api={exceptionsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
