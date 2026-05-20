import React from 'react';
import AIPage from '../components/AIPage';
import { aiTriageAlerts } from '../services/api';

export default function AITriageAlertsPage() {
  return (
    <AIPage
      title="AI Triage: Alerts"
      description="Rank current open alerts P1-P4 with rationale and next steps. Leave inputs blank to pull live open alerts from the DB."
      inputs={[]}
      runner={aiTriageAlerts}
      defaultInput={{}}
      feature="triage-alerts"
    />
  );
}
