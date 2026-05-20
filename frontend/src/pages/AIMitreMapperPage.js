import React from 'react';
import AIPage from '../components/AIPage';
import { aiMitreMapper } from '../services/api';

export default function AIMitreMapperPage() {
  return (
    <AIPage
      title="AI: MITRE ATT&CK Mapper"
      description="Map free-text TTP descriptions to MITRE ATT&CK techniques and mitigations."
      inputs={[
        { name: 'ttp_text', label: 'TTP Description', kind: 'textarea',
          placeholder: 'Adversary used PowerShell to download a payload from a typosquatted CDN and added a scheduled task for persistence.' },
      ]}
      runner={aiMitreMapper}
      defaultInput={{}}
      feature="mitre-mapper"
    />
  );
}
