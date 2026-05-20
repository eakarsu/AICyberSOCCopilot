import React from 'react';
import AIPage from '../components/AIPage';
import { aiBuildHunt } from '../services/api';

export default function AIBuildHuntPage() {
  return (
    <AIPage
      title="AI: Build Threat Hunt"
      description="Translate a hunt hypothesis into MITRE-mapped queries, expected signals, and false-positive traps."
      inputs={[
        { name: 'hypothesis',  label: 'Hypothesis',  kind: 'textarea', placeholder: 'e.g. An attacker is using DNS tunneling for C2 from a corporate workstation.' },
        { name: 'environment', label: 'Environment', kind: 'text',     placeholder: 'mixed Windows/Linux endpoints with EDR + SIEM' },
        { name: 'data_sources_csv', label: 'Data Sources (comma-separated)', kind: 'text', placeholder: 'EDR, SIEM, DNS, proxy, identity' },
      ]}
      runner={(body) => aiBuildHunt({
        hypothesis: body.hypothesis,
        environment: body.environment,
        data_sources: body.data_sources_csv ? body.data_sources_csv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      })}
      defaultInput={{
        hypothesis: 'Adversary is using DNS tunneling for C2 from a corporate workstation.',
        environment: 'mixed Windows/Linux endpoints with EDR + SIEM',
        data_sources_csv: 'EDR, SIEM, DNS, proxy, identity',
      }}
      feature="build-hunt"
    />
  );
}
