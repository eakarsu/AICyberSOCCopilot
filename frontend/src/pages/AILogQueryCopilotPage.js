import React from 'react';
import AIPage from '../components/AIPage';
import { aiLogQueryCopilot } from '../services/api';

export default function AILogQueryCopilotPage() {
  return (
    <AIPage
      title="AI: Log Query Co-Pilot"
      description="Translate natural-language hunts into Splunk SPL, Sentinel KQL, Elastic Lucene, and Sigma YAML."
      inputs={[
        { name: 'intent',        label: 'Hunt intent (natural language)', kind: 'textarea', placeholder: 'Find PowerShell processes downloading from typosquatted Microsoft domains in the last 24h on Windows endpoints.' },
        { name: 'platform',      label: 'Preferred platform',             kind: 'text',     options: ['any','splunk','sentinel','elastic','sigma'] },
        { name: 'schema_hints',  label: 'Schema / field hints (optional)', kind: 'textarea', placeholder: 'Process.parent.name, dns.question.name, http.request.url ...' },
      ]}
      runner={(body) => aiLogQueryCopilot({
        intent: body.intent,
        platform: body.platform,
        schema_hints: body.schema_hints,
      })}
      defaultInput={{ platform: 'any' }}
      feature="log-query-copilot"
    />
  );
}
