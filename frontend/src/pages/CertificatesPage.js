import React from 'react';
import CrudPage from '../components/CrudPage';
import { certificatesApi } from '../services/api';

const fields = [
  { name: 'cert_id',     label: 'Cert ID',    kind: 'text' },
  { name: 'common_name', label: 'CN',         kind: 'text', required: true },
  { name: 'issuer',      label: 'Issuer',     kind: 'text' },
  { name: 'expires_at',  label: 'Expires',    kind: 'datetime' },
  { name: 'status',      label: 'Status',     kind: 'status', options: ['active','expiring','expired'] },
  { name: 'owner',       label: 'Owner',      kind: 'text' },
  { name: 'id',          label: '#',          kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { cert_id: '', common_name: '', issuer: '', expires_at: '', status: 'active', owner: '' };

export default function CertificatesPage() {
  return (
    <CrudPage
      title="Certificates"
      description="TLS / signing certificate inventory with expiry tracking."
      api={certificatesApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
