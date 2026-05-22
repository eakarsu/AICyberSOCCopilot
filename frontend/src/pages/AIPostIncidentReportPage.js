import React from 'react';
import AIPage from '../components/AIPage';
import { aiPostIncidentReport } from '../services/api';

export default function AIPostIncidentReportPage() {
  return (
    <AIPage
      title="AI: Post-Incident Report"
      description="Structured RCA: timeline, root cause, lessons learned, action items."
      inputs={[
        { name: 'incident_title',  label: 'Incident title',           kind: 'text',     placeholder: 'Ransomware on FILE-SRV-02 — final report' },
        { name: 'timeline_notes',  label: 'Timeline / observations',  kind: 'textarea', placeholder: '14:02 EDR mass-rename detected; 14:08 host isolated; 14:21 IR engaged; 14:40 backups verified; 16:05 restoration started; 22:30 prod restored.' },
      ]}
      runner={(body) => aiPostIncidentReport({
        incident: body.incident_title ? { title: body.incident_title } : undefined,
        timeline: body.timeline_notes,
      })}
      defaultInput={{}}
      feature="post-incident-report"
    />
  );
}
