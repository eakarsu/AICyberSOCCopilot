import React from 'react';
import CrudPage from '../components/CrudPage';
import { vendorRiskApi } from '../services/api';

const fields = [
  { name: 'vendor_id',   label: 'ID',           kind: 'text' },
  { name: 'name',        label: 'Vendor',       kind: 'text', required: true },
  { name: 'tier',        label: 'Tier',         kind: 'text', options: ['critical','high','medium','low'] },
  { name: 'soc2',        label: 'SOC 2',        kind: 'bool' },
  { name: 'last_review', label: 'Last Review',  kind: 'datetime' },
  { name: 'risk_score',  label: 'Risk (0-100)', kind: 'number' },
  { name: 'status',      label: 'Status',       kind: 'status', options: ['active','review','inactive'] },
  { name: 'id',          label: '#',            kind: 'text', hideInTable: true, hideInForm: true },
];
const emptyRow = { vendor_id: '', name: '', tier: 'medium', soc2: false, last_review: '', risk_score: 50, status: 'active' };

export default function VendorRiskPage() {
  return (
    <CrudPage
      title="Vendor Risk"
      description="Third-party vendor inventory, attestations, and risk score."
      api={vendorRiskApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
