import React from 'react';
import CrudPage from '../components/CrudPage';
import { secretsVaultApi } from '../services/api';

const fields = [
  { name: 'secret_id',    label: 'ID',           kind: 'text' },
  { name: 'name',         label: 'Name',         kind: 'text', required: true },
  { name: 'scope',        label: 'Scope',        kind: 'text' },
  { name: 'owner',        label: 'Owner',        kind: 'text' },
  { name: 'last_rotated', label: 'Last Rotated', kind: 'datetime' },
  { name: 'rotation_due', label: 'Rotation Due', kind: 'datetime' },
  { name: 'used_by',      label: 'Used By',      kind: 'text' },
  { name: 'id',           label: '#',            kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { secret_id: '', name: '', scope: '', owner: '', last_rotated: '', rotation_due: '', used_by: '' };

export default function SecretsVaultPage() {
  return (
    <CrudPage
      title="Secrets Vault"
      description="Inventory of high-value secrets / API keys with rotation cadence."
      api={secretsVaultApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
