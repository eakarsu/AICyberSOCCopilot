import React from 'react';
import CrudPage from '../components/CrudPage';
import { evidenceLibraryApi } from '../services/api';

const fields = [
  { name: 'evidence_id',  label: 'ID',          kind: 'text' },
  { name: 'control',      label: 'Control',     kind: 'text', required: true },
  { name: 'type',         label: 'Type',        kind: 'status', options: ['screenshot','log','report','cert'] },
  { name: 'collected_at', label: 'Collected',   kind: 'datetime', hideInForm: true },
  { name: 'collected_by', label: 'Collected By',kind: 'text' },
  { name: 'valid_until',  label: 'Valid Until', kind: 'datetime' },
  { name: 'id',           label: '#',           kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { evidence_id: '', control: '', type: 'log', collected_by: '', valid_until: '' };

export default function EvidenceLibraryPage() {
  return (
    <CrudPage
      title="Evidence Library"
      description="Audit-ready evidence catalog with control mapping and validity."
      api={evidenceLibraryApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
