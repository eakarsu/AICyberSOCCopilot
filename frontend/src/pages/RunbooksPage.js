import React from 'react';
import CrudPage from '../components/CrudPage';
import { runbooksApi } from '../services/api';

const fields = [
  { name: 'runbook_id', label: 'ID',         kind: 'text' },
  { name: 'name',       label: 'Name',       kind: 'text', required: true },
  { name: 'scenario',   label: 'Scenario',   kind: 'truncate' },
  { name: 'last_drill', label: 'Last Drill', kind: 'datetime' },
  { name: 'owner',      label: 'Owner',      kind: 'text' },
  { name: 'status',     label: 'Status',     kind: 'status', options: ['active','draft','retired'] },
  { name: 'id',         label: '#',          kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { runbook_id: '', name: '', scenario: '', last_drill: '', owner: '', status: 'active' };

export default function RunbooksPage() {
  return (
    <CrudPage
      title="Runbooks"
      description="IR / SecOps scenario playbooks with drill cadence."
      api={runbooksApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
