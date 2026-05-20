import React from 'react';
import AIPage from '../components/AIPage';
import { aiCompromiseAssess } from '../services/api';

export default function AICompromiseAssessPage() {
  return (
    <AIPage
      title="AI: Compromise Assessment"
      description="Estimate compromise likelihood for an asset and produce a candidate IOC list."
      inputs={[
        { name: 'asset_hostname', label: 'Asset hostname', kind: 'text', placeholder: 'file-srv-02' },
        { name: 'asset_notes',    label: 'Notes',          kind: 'textarea', placeholder: 'critical Windows file server, recently saw mass-rename pattern' },
      ]}
      runner={(body) => aiCompromiseAssess({
        asset: body.asset_hostname || body.asset_notes
          ? { hostname: body.asset_hostname, notes: body.asset_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="compromise-assess"
    />
  );
}
