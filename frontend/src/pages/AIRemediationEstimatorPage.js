import React from 'react';
import AIPage from '../components/AIPage';
import { aiRemediationEstimator } from '../services/api';

export default function AIRemediationEstimatorPage() {
  return (
    <AIPage
      title="AI: Remediation Estimator"
      description="Estimate cost, time, and resourcing for an incident remediation."
      inputs={[
        { name: 'incident_title',    label: 'Incident title',    kind: 'text',     placeholder: 'Cobalt Strike beacon on finance-vm-09' },
        { name: 'incident_severity', label: 'Severity',          kind: 'text',     placeholder: 'critical' },
        { name: 'incident_notes',    label: 'Notes',             kind: 'textarea', placeholder: 'detected via EDR; finance VM; user p.kim' },
      ]}
      runner={(body) => aiRemediationEstimator({
        incident: (body.incident_title || body.incident_severity || body.incident_notes)
          ? { title: body.incident_title, severity: body.incident_severity, notes: body.incident_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="remediation-estimator"
    />
  );
}
