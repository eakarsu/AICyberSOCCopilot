import React from 'react';
import AIPage from '../components/AIPage';
import { aiIdentityRisk } from '../services/api';

export default function AIIdentityRiskPage() {
  return (
    <AIPage
      title="AI: Identity Risk"
      description="Compute identity-risk score and access anomalies for a user."
      inputs={[
        { name: 'user_id',     label: 'User ID',              kind: 'text',     placeholder: 'm.chen' },
        { name: 'user_notes',  label: 'Notes / recent context',kind: 'textarea',placeholder: 'roles: finance-admin, azure-sub-owner; recent: impossible_travel, 24_mfa_pushes' },
      ]}
      runner={(body) => aiIdentityRisk({
        user: (body.user_id || body.user_notes)
          ? { id: body.user_id, notes: body.user_notes }
          : undefined,
      })}
      defaultInput={{}}
      feature="identity-risk"
    />
  );
}
