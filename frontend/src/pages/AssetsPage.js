import React from 'react';
import CrudPage from '../components/CrudPage';
import { assetsApi } from '../services/api';

const fields = [
  { name: 'asset_id',    label: 'Asset ID',    kind: 'text' },
  { name: 'hostname',    label: 'Hostname',    kind: 'text', required: true },
  { name: 'ip',          label: 'IP',          kind: 'text' },
  { name: 'os',          label: 'OS',          kind: 'text' },
  { name: 'owner',       label: 'Owner',       kind: 'text' },
  { name: 'criticality', label: 'Criticality', kind: 'criticality' },
  { name: 'last_seen',   label: 'Last Seen',   kind: 'datetime', hideInForm: true },
  { name: 'id',          label: '#',           kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { asset_id: '', hostname: '', ip: '', os: '', owner: '', criticality: 'medium' };

export default function AssetsPage() {
  return (
    <CrudPage
      title="Assets"
      description="Hosts in the SOC inventory - owner, OS, criticality."
      api={assetsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
