import React from 'react';
import AIPage from '../components/AIPage';
import { aiLogAnomaly } from '../services/api';

export default function AILogAnomalyPage() {
  return (
    <AIPage
      title="AI: Log Anomaly"
      description="Cluster anomalies in a window of log events and rank by severity."
      inputs={[
        { name: 'log_window', label: 'Log window / summary', kind: 'textarea',
          placeholder: 'auth: 532 failed logins for jdoe in 30m; egress: 4.2GB to 185.220.101.45; dns: 1422 NXDOMAIN to *.tk' },
      ]}
      runner={aiLogAnomaly}
      defaultInput={{}}
      feature="log-anomaly"
    />
  );
}
