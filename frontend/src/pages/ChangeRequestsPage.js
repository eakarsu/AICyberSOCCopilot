import React from 'react';
import CrudPage from '../components/CrudPage';
import { changeRequestsApi } from '../services/api';

const fields = [
  { name: 'cr_id',       label: 'CR ID',     kind: 'text' },
  { name: 'summary',     label: 'Summary',   kind: 'truncate', required: true },
  { name: 'requester',   label: 'Requester', kind: 'text' },
  { name: 'risk',        label: 'Risk',      kind: 'severity', options: ['low','medium','high'] },
  { name: 'status',      label: 'Status',    kind: 'status',   options: ['submitted','approved','implemented'] },
  { name: 'approved_by', label: 'Approver',  kind: 'text' },
  { name: 'created_at',  label: 'Created',   kind: 'datetime', hideInForm: true },
  { name: 'id',          label: '#',         kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { cr_id: '', summary: '', requester: '', risk: 'low', status: 'submitted', approved_by: '' };

export default function ChangeRequestsPage() {
  return (
    <CrudPage
      title="Change Requests"
      description="Security-relevant change tickets, approvals, and risk classification."
      api={changeRequestsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
