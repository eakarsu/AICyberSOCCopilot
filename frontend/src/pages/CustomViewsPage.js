import React from 'react';
import AlertTimelineViz from '../components/AlertTimelineViz';
import MitreHeatmapViz from '../components/MitreHeatmapViz';
import IncidentResponseReport from '../components/IncidentResponseReport';
import PlaybookRulesEditor from '../components/PlaybookRulesEditor';

// SOC Views — combines 2 VIZ + 2 NON-VIZ defensive security features.
export default function CustomViewsPage() {
  return (
    <div
      data-testid="custom-views-page"
      style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div>
        <h1 style={{ margin: 0, color: '#e2e8f0' }}>SOC Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 4 }}>
          Defensive-security workspace: alert timeline, MITRE ATT&amp;CK heatmap,
          incident-response report &amp; SOC playbook rules editor.
        </p>
      </div>

      {/* VIZ row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <AlertTimelineViz />
        <MitreHeatmapViz />
      </div>

      {/* NON-VIZ row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <IncidentResponseReport />
        <PlaybookRulesEditor />
      </div>
    </div>
  );
}
