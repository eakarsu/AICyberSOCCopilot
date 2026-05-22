import React from 'react';
import AIPage from '../components/AIPage';
import { aiTabletopExercise } from '../services/api';

export default function AITabletopExercisePage() {
  return (
    <AIPage
      title="AI: Tabletop Exercise Generator"
      description="Generate scenario narrative + timed injects + facilitator notes for a given threat profile."
      inputs={[
        { name: 'threat_profile',    label: 'Threat profile', kind: 'textarea', placeholder: 'Ransomware (Conti-like) encrypts FILE-SRV-02 during business hours; backups partially impacted' },
        { name: 'audience',          label: 'Audience',       kind: 'text',     placeholder: 'SOC L1/L2, IR lead, IT ops, legal, comms' },
        { name: 'duration_minutes',  label: 'Duration (min)', kind: 'text',     placeholder: '90' },
      ]}
      runner={(body) => aiTabletopExercise({
        threat_profile: body.threat_profile,
        audience: body.audience,
        duration_minutes: parseInt(body.duration_minutes, 10) || 90,
      })}
      defaultInput={{ duration_minutes: '90' }}
      feature="tabletop-exercise"
    />
  );
}
