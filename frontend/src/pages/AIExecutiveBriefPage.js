import React from 'react';
import AIPage from '../components/AIPage';
import { aiExecutiveBrief } from '../services/api';

export default function AIExecutiveBriefPage() {
  return (
    <AIPage
      title="AI: Executive Brief"
      description="CISO-ready security posture summary, built from live alert/incident/IOC/asset stats."
      inputs={[]}
      runner={aiExecutiveBrief}
      defaultInput={{}}
      feature="executive-brief"
    />
  );
}
