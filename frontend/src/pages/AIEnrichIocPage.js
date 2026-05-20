import React from 'react';
import AIPage from '../components/AIPage';
import { aiEnrichIoc } from '../services/api';

export default function AIEnrichIocPage() {
  return (
    <AIPage
      title="AI: Enrich IOC"
      description="Enrich an indicator with likely actors, malware, kill-chain phase, blocks and pivot queries. Leave inputs blank to enrich the most recent IOC from the DB."
      inputs={[
        { name: 'type',   label: 'IOC Type',   kind: 'text', placeholder: 'ipv4, domain, sha256, ...' },
        { name: 'value',  label: 'IOC Value',  kind: 'text', placeholder: '185.220.101.45' },
        { name: 'source', label: 'Source',     kind: 'text', placeholder: 'AbuseIPDB' },
      ]}
      runner={(body) => {
        const ioc = (body.type && body.value)
          ? { type: body.type, value: body.value, source: body.source }
          : undefined;
        return aiEnrichIoc({ ioc });
      }}
      defaultInput={{}}
      feature="enrich-ioc"
    />
  );
}
