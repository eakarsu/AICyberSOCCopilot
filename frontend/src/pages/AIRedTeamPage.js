import React from 'react';
import AIPage from '../components/AIPage';
import { aiRedTeam } from '../services/api';

export default function AIRedTeamPage() {
  return (
    <AIPage
      title="AI: Red Team Plan"
      description="Generate a defender-aware red-team attack plan with MITRE ATT&CK mapping."
      inputs={[
        { name: 'scenario',    label: 'Scenario',    kind: 'textarea', placeholder: 'Initial access via phishing leading to ransomware on a Windows file server' },
        { name: 'environment', label: 'Environment', kind: 'text',     placeholder: 'enterprise: Windows AD + AWS + EDR' },
      ]}
      runner={aiRedTeam}
      defaultInput={{ scenario: 'Initial access via phishing leading to ransomware on a Windows file server', environment: 'enterprise: Windows AD + AWS + EDR' }}
      feature="red-team"
    />
  );
}
