import React from 'react';
import AIPage from '../components/AIPage';
import { aiFalsePositiveReducer } from '../services/api';

export default function AIFalsePositiveReducerPage() {
  return (
    <AIPage
      title="AI: False-Positive Reducer"
      description="Score an alert as a likely false positive and suggest a tuned suppression rule."
      inputs={[
        { name: 'alert_title', label: 'Alert title', kind: 'text',     placeholder: 'AV: Win32/Suspicious.Generic on DEV-BUILD-09' },
        { name: 'alert_notes', label: 'Context / evidence', kind: 'textarea', placeholder: 'Same artifact + hash quarantined 12x this month on the same build host. No injection observed.' },
      ]}
      runner={(body) => aiFalsePositiveReducer({
        alert: (body.alert_title || body.alert_notes)
          ? { title: body.alert_title, notes: body.alert_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="false-positive-reducer"
    />
  );
}
