import React from 'react';
import AIPage from '../components/AIPage';
import { aiSupplyChainScan } from '../services/api';

export default function AISupplyChainScanPage() {
  return (
    <AIPage
      title="AI: Supply Chain Scan"
      description="Surface 3rd-party risk, transitive dependencies, and compliance posture."
      inputs={[
        { name: 'vendor_name',  label: 'Vendor name',  kind: 'text',     placeholder: 'Acme Legacy Bills Inc.' },
        { name: 'vendor_notes', label: 'Notes',        kind: 'textarea', placeholder: 'tier: low; no SOC 2; processes invoices' },
      ]}
      runner={(body) => aiSupplyChainScan({
        vendor: (body.vendor_name || body.vendor_notes)
          ? { name: body.vendor_name, notes: body.vendor_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="supply-chain-scan"
    />
  );
}
