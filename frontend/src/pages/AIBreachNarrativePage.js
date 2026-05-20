import React from 'react';
import AIPage from '../components/AIPage';
import { aiBreachNarrative } from '../services/api';

export default function AIBreachNarrativePage() {
  return (
    <AIPage
      title="AI: Breach Narrative"
      description="Produce an executive-ready breach narrative suitable for board / regulator briefing."
      inputs={[
        { name: 'incident_title', label: 'Incident title', kind: 'text',     placeholder: 'Suspected ransomware on FILE-SRV-02' },
        { name: 'incident_notes', label: 'Notes / context',kind: 'textarea', placeholder: 'detected via EDR mass-rename pattern; 2 hours since detection; backups intact' },
      ]}
      runner={(body) => aiBreachNarrative({
        incident: (body.incident_title || body.incident_notes)
          ? { title: body.incident_title, notes: body.incident_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="breach-narrative"
    />
  );
}
