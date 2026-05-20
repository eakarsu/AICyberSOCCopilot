import React from 'react';
import CrudPage from '../components/CrudPage';
import { playbooksApi } from '../services/api';

const fields = [
  { name: 'playbook_id', label: 'Playbook ID', kind: 'text' },
  { name: 'name',        label: 'Name',        kind: 'text',     required: true },
  { name: 'trigger',     label: 'Trigger',     kind: 'truncate' },
  { name: 'steps_count', label: 'Steps',       kind: 'number' },
  { name: 'owner',       label: 'Owner',       kind: 'text' },
  { name: 'last_run',    label: 'Last Run',    kind: 'datetime' },
  { name: 'id',          label: '#',           kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { playbook_id: '', name: '', trigger: '', steps_count: 0, owner: '', last_run: null };

export default function PlaybooksPage() {
  return (
    <CrudPage
      title="Playbooks"
      description="SOAR runbooks and IR procedures - trigger, owner, last run."
      api={playbooksApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
