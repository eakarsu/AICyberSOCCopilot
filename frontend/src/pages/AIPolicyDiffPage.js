import React from 'react';
import AIPage from '../components/AIPage';
import { aiPolicyDiff } from '../services/api';

export default function AIPolicyDiffPage() {
  return (
    <AIPage
      title="AI: Policy Diff"
      description="Compare two policies and surface added / removed / weakened controls."
      inputs={[
        { name: 'old_policy', label: 'Old Policy', kind: 'textarea', placeholder: 'Paste the previous policy version...' },
        { name: 'new_policy', label: 'New Policy', kind: 'textarea', placeholder: 'Paste the new policy version...' },
      ]}
      runner={aiPolicyDiff}
      defaultInput={{}}
      feature="policy-diff"
    />
  );
}
