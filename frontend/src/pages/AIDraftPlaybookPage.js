import React from 'react';
import AIPage from '../components/AIPage';
import { aiDraftPlaybook } from '../services/api';

export default function AIDraftPlaybookPage() {
  return (
    <AIPage
      title="AI: Draft SOAR Playbook"
      description="Generate a structured SOAR playbook from a trigger and a goal."
      inputs={[
        { name: 'trigger',     label: 'Trigger',     kind: 'textarea', placeholder: 'e.g. EDR detects credential dumping on a domain controller' },
        { name: 'goal',        label: 'Goal',        kind: 'textarea', placeholder: 'Contain host, rotate creds, preserve forensics' },
        { name: 'constraints', label: 'Constraints', kind: 'text',     placeholder: 'least-privilege, auditable, reversible' },
      ]}
      runner={aiDraftPlaybook}
      defaultInput={{
        trigger: 'EDR detects credential dumping on a domain controller',
        goal: 'Contain the host, rotate impacted credentials, and preserve forensic evidence',
        constraints: 'least-privilege, auditable, reversible where possible',
      }}
      feature="draft-playbook"
    />
  );
}
