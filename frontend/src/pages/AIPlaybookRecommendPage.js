import React from 'react';
import AIPage from '../components/AIPage';
import { aiPlaybookRecommend } from '../services/api';

export default function AIPlaybookRecommendPage() {
  return (
    <AIPage
      title="AI: Playbook Recommender"
      description="Rank existing SOAR playbooks against a live incident context."
      inputs={[
        { name: 'incident_title', label: 'Incident title', kind: 'text',     placeholder: 'Suspected ransomware on FILE-SRV-02' },
        { name: 'incident_notes', label: 'Context',        kind: 'textarea', placeholder: 'EDR mass-rename pattern at 14:02 UTC, .LOCKED extension, ~840k files. Backups intact.' },
      ]}
      runner={(body) => aiPlaybookRecommend({
        incident: (body.incident_title || body.incident_notes)
          ? { title: body.incident_title, notes: body.incident_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="playbook-recommend"
    />
  );
}
