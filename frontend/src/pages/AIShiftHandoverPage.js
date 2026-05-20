import React from 'react';
import AIPage from '../components/AIPage';
import { aiShiftHandover } from '../services/api';

export default function AIShiftHandoverPage() {
  return (
    <AIPage
      title="AI: Shift Handover"
      description="Briefing for the incoming SOC shift built from live open incidents, alerts, and high-confidence IOCs."
      inputs={[
        { name: 'outgoing_shift', label: 'Outgoing Shift', kind: 'text', placeholder: 'Day (08:00-16:00)' },
      ]}
      runner={aiShiftHandover}
      defaultInput={{ outgoing_shift: 'Day (08:00-16:00)' }}
      feature="shift-handover"
    />
  );
}
