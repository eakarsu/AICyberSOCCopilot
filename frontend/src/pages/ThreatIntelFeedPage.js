import React from 'react';
import CrudPage from '../components/CrudPage';
import { threatIntelApi } from '../services/api';

const fields = [
  { name: 'feed_id',      label: 'Feed ID',      kind: 'text' },
  { name: 'source',       label: 'Source',       kind: 'text' },
  { name: 'indicator',    label: 'Indicator',    kind: 'truncate', required: true },
  { name: 'threat_actor', label: 'Threat Actor', kind: 'text' },
  { name: 'ttp',          label: 'TTP',          kind: 'truncate' },
  { name: 'severity',     label: 'Severity',     kind: 'severity' },
  { name: 'observed_at',  label: 'Observed',     kind: 'datetime', hideInForm: true },
  { name: 'id',           label: '#',            kind: 'text',     hideInTable: true, hideInForm: true },
];

const emptyRow = { feed_id: '', source: '', indicator: '', threat_actor: '', ttp: '', severity: 'medium' };

export default function ThreatIntelFeedPage() {
  return (
    <CrudPage
      title="Threat Intel Feed"
      description="Curated TI: actors, TTPs and observed indicators."
      api={threatIntelApi}
      fields={fields}
      emptyRow={emptyRow}
    />
  );
}
