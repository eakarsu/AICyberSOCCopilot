import React from 'react';
import CrudPage from '../components/CrudPage';
import { vulnerabilitiesApi } from '../services/api';

const fields = [
  { name: 'cve',            label: 'CVE',          kind: 'text',     required: true },
  { name: 'cvss',           label: 'CVSS',         kind: 'number' },
  { name: 'asset',          label: 'Asset',        kind: 'text' },
  { name: 'status',         label: 'Status',       kind: 'status',   options: ['open','patching','mitigated','accepted'] },
  { name: 'discovered_at',  label: 'Discovered',   kind: 'datetime', hideInForm: true },
  { name: 'patch_eta',      label: 'Patch ETA',    kind: 'text' },
  { name: 'id',             label: '#',            kind: 'text',     hideInTable: true, hideInForm: true },
];
const emptyRow = { cve: '', cvss: 7.0, asset: '', status: 'open', patch_eta: '' };

export default function VulnerabilitiesPage() {
  return (
    <CrudPage
      title="Vulnerabilities"
      description="Tracked CVEs across the estate with patch timelines and mitigation status."
      api={vulnerabilitiesApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
