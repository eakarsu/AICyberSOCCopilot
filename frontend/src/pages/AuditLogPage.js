import React from 'react';
import CrudPage from '../components/CrudPage';
import { auditLogApi } from '../services/api';

const fields = [
  { name: 'log_id',    label: 'Log ID',   kind: 'text' },
  { name: 'actor',     label: 'Actor',    kind: 'text', required: true },
  { name: 'action',    label: 'Action',   kind: 'text' },
  { name: 'target',    label: 'Target',   kind: 'truncate' },
  { name: 'result',    label: 'Result',   kind: 'result', options: ['success','failed','denied'] },
  { name: 'timestamp', label: 'When',     kind: 'datetime', hideInForm: true },
  { name: 'id',        label: '#',        kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { log_id: '', actor: '', action: '', target: '', result: 'success' };

export default function AuditLogPage() {
  return (
    <CrudPage
      title="Audit Log"
      description="Every SOC action - actor, action, target, result."
      api={auditLogApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
