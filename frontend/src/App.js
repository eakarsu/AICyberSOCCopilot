import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';

// Original CRUD (8)
import AlertsPage from './pages/AlertsPage';
import IncidentsPage from './pages/IncidentsPage';
import AssetsPage from './pages/AssetsPage';
import PlaybooksPage from './pages/PlaybooksPage';
import IocsPage from './pages/IocsPage';
import ThreatIntelFeedPage from './pages/ThreatIntelFeedPage';
import ShiftRosterPage from './pages/ShiftRosterPage';
import AuditLogPage from './pages/AuditLogPage';

// New CRUD (10)
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import ExceptionsPage from './pages/ExceptionsPage';
import ChangeRequestsPage from './pages/ChangeRequestsPage';
import VendorRiskPage from './pages/VendorRiskPage';
import CertificatesPage from './pages/CertificatesPage';
import SecretsVaultPage from './pages/SecretsVaultPage';
import RunbooksPage from './pages/RunbooksPage';
import EvidenceLibraryPage from './pages/EvidenceLibraryPage';
import AllowlistsPage from './pages/AllowlistsPage';
import BlocklistsPage from './pages/BlocklistsPage';

// Original AI (6)
import AITriageAlertsPage from './pages/AITriageAlertsPage';
import AIBuildHuntPage from './pages/AIBuildHuntPage';
import AIEnrichIocPage from './pages/AIEnrichIocPage';
import AIExecutiveBriefPage from './pages/AIExecutiveBriefPage';
import AIDraftPlaybookPage from './pages/AIDraftPlaybookPage';
import AIShiftHandoverPage from './pages/AIShiftHandoverPage';

// New AI (10)
import AIRedTeamPage from './pages/AIRedTeamPage';
import AIPhishingClassifierPage from './pages/AIPhishingClassifierPage';
import AIPolicyDiffPage from './pages/AIPolicyDiffPage';
import AIMitreMapperPage from './pages/AIMitreMapperPage';
import AICompromiseAssessPage from './pages/AICompromiseAssessPage';
import AIRemediationEstimatorPage from './pages/AIRemediationEstimatorPage';
import AILogAnomalyPage from './pages/AILogAnomalyPage';
import AIIdentityRiskPage from './pages/AIIdentityRiskPage';
import AISupplyChainScanPage from './pages/AISupplyChainScanPage';
import AIBreachNarrativePage from './pages/AIBreachNarrativePage';

// Cross-cutting
import WebhooksPage from './pages/WebhooksPage';
import LoginPage from './pages/LoginPage';
import CustomViewsPage from './pages/CustomViewsPage';

import { isAuthed } from './services/api';
import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function ProtectedLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ProtectedLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  {/* Original CRUD */}
                  <Route path="/alerts"             element={<AlertsPage />} />
                  <Route path="/incidents"          element={<IncidentsPage />} />
                  <Route path="/assets"             element={<AssetsPage />} />
                  <Route path="/playbooks"          element={<PlaybooksPage />} />
                  <Route path="/iocs"               element={<IocsPage />} />
                  <Route path="/threat-intel-feed"  element={<ThreatIntelFeedPage />} />
                  <Route path="/shift-roster"       element={<ShiftRosterPage />} />
                  <Route path="/audit-log"          element={<AuditLogPage />} />
                  {/* New CRUD */}
                  <Route path="/vulnerabilities"    element={<VulnerabilitiesPage />} />
                  <Route path="/exceptions"         element={<ExceptionsPage />} />
                  <Route path="/change-requests"    element={<ChangeRequestsPage />} />
                  <Route path="/vendor-risk"        element={<VendorRiskPage />} />
                  <Route path="/certificates"       element={<CertificatesPage />} />
                  <Route path="/secrets-vault"      element={<SecretsVaultPage />} />
                  <Route path="/runbooks"           element={<RunbooksPage />} />
                  <Route path="/evidence-library"   element={<EvidenceLibraryPage />} />
                  <Route path="/allowlists"         element={<AllowlistsPage />} />
                  <Route path="/blocklists"         element={<BlocklistsPage />} />
                  {/* Original AI */}
                  <Route path="/ai/triage-alerts"   element={<AITriageAlertsPage />} />
                  <Route path="/ai/build-hunt"      element={<AIBuildHuntPage />} />
                  <Route path="/ai/enrich-ioc"      element={<AIEnrichIocPage />} />
                  <Route path="/ai/executive-brief" element={<AIExecutiveBriefPage />} />
                  <Route path="/ai/draft-playbook"  element={<AIDraftPlaybookPage />} />
                  <Route path="/ai/shift-handover"  element={<AIShiftHandoverPage />} />
                  {/* New AI */}
                  <Route path="/ai/red-team"              element={<AIRedTeamPage />} />
                  <Route path="/ai/phishing-classifier"   element={<AIPhishingClassifierPage />} />
                  <Route path="/ai/policy-diff"           element={<AIPolicyDiffPage />} />
                  <Route path="/ai/mitre-mapper"          element={<AIMitreMapperPage />} />
                  <Route path="/ai/compromise-assess"     element={<AICompromiseAssessPage />} />
                  <Route path="/ai/remediation-estimator" element={<AIRemediationEstimatorPage />} />
                  <Route path="/ai/log-anomaly"           element={<AILogAnomalyPage />} />
                  <Route path="/ai/identity-risk"         element={<AIIdentityRiskPage />} />
                  <Route path="/ai/supply-chain-scan"     element={<AISupplyChainScanPage />} />
                  <Route path="/ai/breach-narrative"      element={<AIBreachNarrativePage />} />
                  {/* Admin */}
                  <Route path="/webhooks"           element={<WebhooksPage />} />
                  {/* SOC Views — custom defensive-security workspace */}
                  <Route path="/custom-views"       element={<CustomViewsPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ProtectedLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
