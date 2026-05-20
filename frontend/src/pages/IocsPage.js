import React from 'react';
import CrudPage from '../components/CrudPage';
import { iocsApi } from '../services/api';

const fields = [
  { name: 'ioc_id',     label: 'IOC ID',     kind: 'text' },
  { name: 'type',       label: 'Type',       kind: 'text', options: ['ipv4','ipv6','domain','url','sha256','md5','email','cve'] },
  { name: 'value',      label: 'Value',      kind: 'truncate', required: true },
  { name: 'source',     label: 'Source',     kind: 'text' },
  { name: 'confidence', label: 'Confidence', kind: 'confidence' },
  { name: 'first_seen', label: 'First Seen', kind: 'datetime', hideInForm: true },
  { name: 'id',         label: '#',          kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { ioc_id: '', type: 'ipv4', value: '', source: '', confidence: 0.5 };

export default function IocsPage() {
  return (
    <CrudPage
      title="IOCs"
      description="Indicators of compromise - type, value, source, confidence."
      api={iocsApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
