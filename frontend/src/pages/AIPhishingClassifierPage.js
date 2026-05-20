import React from 'react';
import AIPage from '../components/AIPage';
import { aiPhishingClassifier } from '../services/api';

export default function AIPhishingClassifierPage() {
  return (
    <AIPage
      title="AI: Phishing Classifier"
      description="Score an email for phishing risk with indicator extraction."
      inputs={[
        { name: 'email', label: 'Email (headers + body)', kind: 'textarea',
          placeholder: 'From: invoice-billing@accountspay-corp.com\nSubject: Your invoice is overdue\n...' },
      ]}
      runner={aiPhishingClassifier}
      defaultInput={{}}
      feature="phishing-classifier"
    />
  );
}
