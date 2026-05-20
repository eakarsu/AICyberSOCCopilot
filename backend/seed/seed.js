const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_cyber_soc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Dropping & recreating tables...');
    await client.query(`
      DROP TABLE IF EXISTS ai_results CASCADE;
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS shift_roster CASCADE;
      DROP TABLE IF EXISTS threat_intel_feed CASCADE;
      DROP TABLE IF EXISTS iocs CASCADE;
      DROP TABLE IF EXISTS playbooks CASCADE;
      DROP TABLE IF EXISTS assets CASCADE;
      DROP TABLE IF EXISTS incidents CASCADE;
      DROP TABLE IF EXISTS alerts CASCADE;
      -- Extended
      DROP TABLE IF EXISTS vulnerabilities CASCADE;
      DROP TABLE IF EXISTS exceptions CASCADE;
      DROP TABLE IF EXISTS change_requests CASCADE;
      DROP TABLE IF EXISTS vendor_risk CASCADE;
      DROP TABLE IF EXISTS certificates CASCADE;
      DROP TABLE IF EXISTS secrets_vault CASCADE;
      DROP TABLE IF EXISTS runbooks CASCADE;
      DROP TABLE IF EXISTS evidence_library CASCADE;
      DROP TABLE IF EXISTS allowlists CASCADE;
      DROP TABLE IF EXISTS blocklists CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS attachments CASCADE;
      DROP TABLE IF EXISTS webhook_deliveries CASCADE;
      DROP TABLE IF EXISTS webhooks CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    for (const f of ['001_schema.sql', '002_schema_extended.sql']) {
      const schema = fs.readFileSync(path.join(__dirname, '..', 'migrations', f), 'utf8');
      await client.query(schema);
      console.log(`Applied migration ${f}.`);
    }

    // -------- users (RBAC) --------
    const users = [
      { email: 'admin@socops.io',    pw: 'admin123',    name: 'SOC Admin',   role: 'admin'   },
      { email: 'analyst@socops.io',  pw: 'analyst123',  name: 'SOC Analyst', role: 'analyst' },
      { email: 'viewer@socops.io',   pw: 'viewer123',   name: 'SOC Viewer',  role: 'viewer'  },
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO users (email, password, name, role) VALUES ($1,$2,$3,$4)`,
        [u.email, u.pw, u.name, u.role]
      );
    }
    console.log(`Inserted ${users.length} users (RBAC).`);

    // -------- alerts --------
    const alerts = [
      { aid: 'ALR-0001', src: 'CrowdStrike Falcon',    sev: 'critical', title: 'Ransomware behavior detected on FILE-SRV-02',                  status: 'investigating', asset: 'file-srv-02' },
      { aid: 'ALR-0002', src: 'Microsoft Defender',    sev: 'high',     title: 'Suspicious LSASS access from rundll32',                         status: 'open',          asset: 'corp-wks-114' },
      { aid: 'ALR-0003', src: 'Splunk ES',             sev: 'high',     title: 'Impossible travel: user logged in from US then RU within 12m', status: 'open',          asset: 'okta:idm' },
      { aid: 'ALR-0004', src: 'Suricata IDS',          sev: 'medium',   title: 'ET POLICY DNS query to known DGA domain',                       status: 'open',          asset: 'web-edge-01' },
      { aid: 'ALR-0005', src: 'Wazuh',                 sev: 'medium',   title: 'Auditd: /etc/shadow read by non-root process',                  status: 'investigating', asset: 'db-prod-04' },
      { aid: 'ALR-0006', src: 'AWS GuardDuty',         sev: 'high',     title: 'CryptoCurrency:EC2/BitcoinTool.B!DNS on ec2-i-0abc1234',        status: 'open',          asset: 'i-0abc1234' },
      { aid: 'ALR-0007', src: 'Sentinel',              sev: 'low',      title: 'Multiple failed Azure AD sign-ins from single IP',              status: 'open',          asset: 'azuread:tenant' },
      { aid: 'ALR-0008', src: 'Zeek',                  sev: 'medium',   title: 'Long-running outbound TLS to suspicious ASN',                   status: 'open',          asset: 'corp-wks-203' },
      { aid: 'ALR-0009', src: 'CrowdStrike Falcon',    sev: 'critical', title: 'Cobalt Strike beacon traffic pattern from finance-vm-09',      status: 'investigating', asset: 'finance-vm-09' },
      { aid: 'ALR-0010', src: 'Defender for Cloud',    sev: 'high',     title: 'Privileged role assignment outside change window',              status: 'open',          asset: 'azuresub:prod' },
      { aid: 'ALR-0011', src: 'Splunk ES',             sev: 'medium',   title: 'New service installation on domain controller DC-01',           status: 'open',          asset: 'dc-01' },
      { aid: 'ALR-0012', src: 'Okta SysLog',           sev: 'medium',   title: 'MFA fatigue: 24 push attempts in 60s for user jdoe',           status: 'open',          asset: 'okta:user:jdoe' },
      { aid: 'ALR-0013', src: 'Cloudflare WAF',        sev: 'low',      title: 'SQLi attempt blocked against /api/login',                       status: 'closed',        asset: 'web-edge-01' },
      { aid: 'ALR-0014', src: 'Wazuh',                 sev: 'high',     title: 'New SUID binary appeared in /tmp on jumphost',                  status: 'open',          asset: 'jumphost-01' },
      { aid: 'ALR-0015', src: 'CrowdStrike Falcon',    sev: 'critical', title: 'Mass file rename pattern consistent with LockBit on FILE-SRV-02', status: 'investigating', asset: 'file-srv-02' },
    ];
    for (const a of alerts) {
      await client.query(
        `INSERT INTO alerts (alert_id, source, severity, title, status, asset) VALUES ($1,$2,$3,$4,$5,$6)`,
        [a.aid, a.src, a.sev, a.title, a.status, a.asset]
      );
    }
    console.log(`Inserted ${alerts.length} alerts.`);

    // -------- incidents --------
    const incidents = [
      { iid: 'INC-2001', t: 'Suspected ransomware on file server FILE-SRV-02', sev: 'critical', st: 'in_progress', who: 'aria.lopez',   sla: 60   },
      { iid: 'INC-2002', t: 'Compromised user account: m.chen via MFA fatigue', sev: 'high',    st: 'open',        who: 'kavin.rao',    sla: 120  },
      { iid: 'INC-2003', t: 'Cryptominer running on EC2 i-0abc1234',           sev: 'high',     st: 'in_progress', who: 'priya.shah',   sla: 240  },
      { iid: 'INC-2004', t: 'Privileged role abuse in Azure prod subscription', sev: 'critical', st: 'open',        who: 'aria.lopez',   sla: 60   },
      { iid: 'INC-2005', t: 'Cobalt Strike beacon on finance-vm-09',            sev: 'critical', st: 'in_progress', who: 'sam.becker',   sla: 30   },
      { iid: 'INC-2006', t: 'Insider data exfil suspicion via personal Gmail',  sev: 'medium',   st: 'open',        who: 'priya.shah',   sla: 480  },
      { iid: 'INC-2007', t: 'Phishing campaign targeting finance team',         sev: 'medium',   st: 'open',        who: 'kavin.rao',    sla: 360  },
      { iid: 'INC-2008', t: 'Brute force against VPN gateway vpn-gw-01',        sev: 'medium',   st: 'in_progress', who: 'sam.becker',   sla: 240  },
      { iid: 'INC-2009', t: 'Outdated Apache exposed: CVE-2021-41773 risk',     sev: 'high',     st: 'open',        who: 'aria.lopez',   sla: 720  },
      { iid: 'INC-2010', t: 'Suspicious new service install on dc-01',          sev: 'high',     st: 'in_progress', who: 'priya.shah',   sla: 120  },
      { iid: 'INC-2011', t: 'GuardDuty: Trojan:EC2/BlackholeTraffic flagged',   sev: 'medium',   st: 'open',        who: 'kavin.rao',    sla: 360  },
      { iid: 'INC-2012', t: 'Stolen laptop reported by user n.patel',           sev: 'high',     st: 'in_progress', who: 'sam.becker',   sla: 240  },
      { iid: 'INC-2013', t: 'Malicious npm dep introduced via PR #4421',        sev: 'medium',   st: 'open',        who: 'aria.lopez',   sla: 480  },
      { iid: 'INC-2014', t: 'Misconfigured S3 bucket public: marketing-assets', sev: 'low',      st: 'resolved',    who: 'priya.shah',   sla: 1440 },
      { iid: 'INC-2015', t: 'Anonymous tip: insider selling customer data',     sev: 'critical', st: 'open',        who: 'aria.lopez',   sla: 60   },
    ];
    for (const i of incidents) {
      await client.query(
        `INSERT INTO incidents (incident_id, title, severity, status, assignee, sla_breach_in_min) VALUES ($1,$2,$3,$4,$5,$6)`,
        [i.iid, i.t, i.sev, i.st, i.who, i.sla]
      );
    }
    console.log(`Inserted ${incidents.length} incidents.`);

    // -------- assets --------
    const assets = [
      { id: 'AST-001', h: 'web-edge-01',    ip: '10.20.4.11',   os: 'Ubuntu 22.04',      o: 'platform-eng',   c: 'high'     },
      { id: 'AST-002', h: 'web-edge-02',    ip: '10.20.4.12',   os: 'Ubuntu 22.04',      o: 'platform-eng',   c: 'high'     },
      { id: 'AST-003', h: 'file-srv-02',    ip: '10.30.6.21',   os: 'Windows Server 2019', o: 'it-ops',       c: 'critical' },
      { id: 'AST-004', h: 'dc-01',          ip: '10.30.6.10',   os: 'Windows Server 2022', o: 'identity',     c: 'critical' },
      { id: 'AST-005', h: 'db-prod-04',     ip: '10.40.2.18',   os: 'RHEL 9',            o: 'data-platform',  c: 'critical' },
      { id: 'AST-006', h: 'jumphost-01',    ip: '10.10.1.5',    os: 'Debian 12',         o: 'secops',         c: 'high'     },
      { id: 'AST-007', h: 'finance-vm-09',  ip: '10.50.7.34',   os: 'Windows 11 Pro',    o: 'finance',        c: 'high'     },
      { id: 'AST-008', h: 'corp-wks-114',   ip: '10.60.12.114', os: 'Windows 11 Pro',    o: 'engineering',    c: 'medium'   },
      { id: 'AST-009', h: 'corp-wks-203',   ip: '10.60.12.203', os: 'macOS 14',          o: 'design',         c: 'medium'   },
      { id: 'AST-010', h: 'k8s-prod-01',    ip: '10.70.3.11',   os: 'Talos Linux',       o: 'platform-eng',   c: 'critical' },
      { id: 'AST-011', h: 'k8s-prod-02',    ip: '10.70.3.12',   os: 'Talos Linux',       o: 'platform-eng',   c: 'critical' },
      { id: 'AST-012', h: 'vpn-gw-01',      ip: '203.0.113.10', os: 'pfSense 2.7',       o: 'network',        c: 'high'     },
      { id: 'AST-013', h: 'i-0abc1234',     ip: '54.205.10.18', os: 'Amazon Linux 2023', o: 'data-platform',  c: 'high'     },
      { id: 'AST-014', h: 'siem-collector', ip: '10.10.1.40',   os: 'Ubuntu 22.04',      o: 'secops',         c: 'high'     },
      { id: 'AST-015', h: 'backup-nas-01',  ip: '10.30.6.50',   os: 'TrueNAS SCALE',     o: 'it-ops',         c: 'critical' },
    ];
    for (const a of assets) {
      await client.query(
        `INSERT INTO assets (asset_id, hostname, ip, os, owner, criticality, last_seen) VALUES ($1,$2,$3,$4,$5,$6, NOW() - INTERVAL '${Math.floor(Math.random()*60)} minutes')`,
        [a.id, a.h, a.ip, a.os, a.o, a.c]
      );
    }
    console.log(`Inserted ${assets.length} assets.`);

    // -------- playbooks --------
    const playbooks = [
      { pid: 'PB-100', n: 'Contain compromised endpoint',           tr: 'EDR critical detection',     sc: 9,  o: 'secops',   r: '2 hours ago'   },
      { pid: 'PB-101', n: 'Reset credentials & rotate tokens',      tr: 'Account takeover suspected',  sc: 7,  o: 'identity', r: '1 day ago'     },
      { pid: 'PB-102', n: 'Triage phishing email',                  tr: 'User-reported phishing',      sc: 8,  o: 'secops',   r: '6 hours ago'   },
      { pid: 'PB-103', n: 'Block malicious IOC at perimeter',       tr: 'TI feed high-confidence IOC', sc: 5,  o: 'network',  r: '3 days ago'    },
      { pid: 'PB-104', n: 'Ransomware response (IR-RW-01)',         tr: 'Mass file rename detected',   sc: 14, o: 'ir',       r: null            },
      { pid: 'PB-105', n: 'Insider threat investigation',           tr: 'DLP / HR escalation',         sc: 11, o: 'ir',       r: '2 weeks ago'   },
      { pid: 'PB-106', n: 'Cloud key compromise (AWS)',             tr: 'GuardDuty CredentialAccess',  sc: 10, o: 'cloud-sec',r: '5 days ago'    },
      { pid: 'PB-107', n: 'Cobalt Strike beacon containment',       tr: 'EDR Cobalt Strike pattern',   sc: 12, o: 'ir',       r: '12 hours ago'  },
      { pid: 'PB-108', n: 'Suspicious privileged role assignment',  tr: 'PIM / Cloud IAM anomaly',     sc: 6,  o: 'cloud-sec',r: '4 days ago'    },
      { pid: 'PB-109', n: 'Brute force VPN response',               tr: 'IDS brute force pattern',     sc: 6,  o: 'network',  r: '1 week ago'    },
      { pid: 'PB-110', n: 'Tabletop: BEC against finance',          tr: 'Manual trigger',              sc: 8,  o: 'secops',   r: null            },
      { pid: 'PB-111', n: 'Patch out-of-band: emergency CVE',       tr: 'CVSS >= 9.0 published',       sc: 7,  o: 'platform', r: '1 month ago'   },
      { pid: 'PB-112', n: 'Forensic disk + memory acquisition',     tr: 'IR-managed playbook',         sc: 9,  o: 'ir',       r: '3 weeks ago'   },
      { pid: 'PB-113', n: 'Threat-hunt: persistence via scheduled tasks', tr: 'Scheduled monthly',     sc: 5,  o: 'secops',   r: '10 days ago'   },
      { pid: 'PB-114', n: 'Notify executives & legal',              tr: 'Severity >= critical',        sc: 4,  o: 'ciso',     r: '1 day ago'     },
    ];
    for (const p of playbooks) {
      await client.query(
        `INSERT INTO playbooks (playbook_id, name, trigger, steps_count, owner, last_run)
         VALUES ($1,$2,$3,$4,$5, ${p.r ? `NOW() - INTERVAL '${Math.floor(Math.random()*30)+1} days'` : 'NULL'})`,
        [p.pid, p.n, p.tr, p.sc, p.o]
      );
    }
    console.log(`Inserted ${playbooks.length} playbooks.`);

    // -------- iocs --------
    const iocs = [
      { id: 'IOC-001', t: 'ipv4',   v: '185.220.101.45',                                                  s: 'AbuseIPDB',     c: 0.92 },
      { id: 'IOC-002', t: 'ipv4',   v: '45.155.205.233',                                                  s: 'CrowdStrike',   c: 0.85 },
      { id: 'IOC-003', t: 'domain', v: 'updates-microsoft-cdn.com',                                       s: 'OTX',           c: 0.78 },
      { id: 'IOC-004', t: 'domain', v: 'cdn-statics-akmai.net',                                           s: 'Mandiant',      c: 0.81 },
      { id: 'IOC-005', t: 'url',    v: 'https://login-microsoftonline.support-secure.com/redirect',       s: 'PhishTank',     c: 0.95 },
      { id: 'IOC-006', t: 'sha256', v: '9b74c9897bac770ffc029102a200c5de6f9b3c7e1c52c8e7c8e6c8e1f5a3b8c0', s: 'VirusTotal',   c: 0.88 },
      { id: 'IOC-007', t: 'sha256', v: '44d88612fea8a8f36de82e1278abb02f74d80c0cabbf3a76a7c4f6c1d2a3b4c5', s: 'Hybrid Analysis', c: 0.74 },
      { id: 'IOC-008', t: 'md5',    v: '5d41402abc4b2a76b9719d911017c592',                                s: 'internal-malware-lab', c: 0.65 },
      { id: 'IOC-009', t: 'email',  v: 'invoice-billing@accountspay-corp.com',                            s: 'user-report',   c: 0.70 },
      { id: 'IOC-010', t: 'cve',    v: 'CVE-2024-23897',                                                  s: 'NVD',           c: 0.99 },
      { id: 'IOC-011', t: 'cve',    v: 'CVE-2023-46604',                                                  s: 'NVD',           c: 0.99 },
      { id: 'IOC-012', t: 'cve',    v: 'CVE-2021-44228',                                                  s: 'NVD',           c: 0.99 },
      { id: 'IOC-013', t: 'ipv4',   v: '141.98.10.122',                                                   s: 'Shodan',        c: 0.60 },
      { id: 'IOC-014', t: 'domain', v: 'paste.ee.suspicious-mirror.ru',                                   s: 'OSINT',         c: 0.55 },
      { id: 'IOC-015', t: 'url',    v: 'http://203.0.113.45:8443/jquery-3.6.0.min.js',                    s: 'Suricata',      c: 0.80 },
    ];
    for (const i of iocs) {
      await client.query(
        `INSERT INTO iocs (ioc_id, type, value, source, confidence, first_seen)
         VALUES ($1,$2,$3,$4,$5, NOW() - INTERVAL '${Math.floor(Math.random()*30)+1} days')`,
        [i.id, i.t, i.v, i.s, i.c]
      );
    }
    console.log(`Inserted ${iocs.length} IOCs.`);

    // -------- threat_intel_feed --------
    const feeds = [
      { fid: 'TI-3001', s: 'Mandiant Advantage', ind: '185.220.101.45',                ta: 'APT28 (Fancy Bear)',     ttp: 'T1071.001 Web Protocols',     sev: 'high'     },
      { fid: 'TI-3002', s: 'CrowdStrike Intel',  ind: 'updates-microsoft-cdn.com',     ta: 'BERSERK BEAR',           ttp: 'T1566.002 Spearphishing Link', sev: 'high'     },
      { fid: 'TI-3003', s: 'Recorded Future',    ind: 'CVE-2024-23897',                ta: 'Initial-access broker',  ttp: 'T1190 Exploit Public-Facing', sev: 'critical' },
      { fid: 'TI-3004', s: 'AlienVault OTX',     ind: '45.155.205.233',                ta: 'FIN7',                   ttp: 'T1059 Command and Scripting',  sev: 'high'     },
      { fid: 'TI-3005', s: 'GreyNoise',          ind: '141.98.10.122',                 ta: 'Unattributed scanner',   ttp: 'T1595.001 Active Scanning',    sev: 'low'      },
      { fid: 'TI-3006', s: 'Microsoft MSTIC',    ind: 'login-microsoftonline.support-secure.com', ta: 'Storm-0501', ttp: 'T1566.003 Spearphishing via Service', sev: 'high' },
      { fid: 'TI-3007', s: 'CISA AA24',          ind: 'CVE-2023-46604',                ta: 'LockBit affiliate',      ttp: 'T1190 Exploit Public-Facing', sev: 'critical' },
      { fid: 'TI-3008', s: 'Talos Intel',        ind: 'sha256:9b74c989...a3b8c0',      ta: 'TA505',                  ttp: 'T1486 Data Encrypted for Impact', sev: 'critical' },
      { fid: 'TI-3009', s: 'Mandiant Advantage', ind: 'cdn-statics-akmai.net',         ta: 'UNC4841',                ttp: 'T1071.004 DNS',                sev: 'high'     },
      { fid: 'TI-3010', s: 'Internal SOC TI',    ind: 'invoice-billing@accountspay-corp.com', ta: 'Unknown',         ttp: 'T1566 Phishing',               sev: 'medium'   },
      { fid: 'TI-3011', s: 'CISA AA23',          ind: 'CVE-2021-44228',                ta: 'Multiple actors',        ttp: 'T1190 Exploit Public-Facing',  sev: 'critical' },
      { fid: 'TI-3012', s: 'Recorded Future',    ind: 'paste.ee.suspicious-mirror.ru', ta: 'Lazarus Group',          ttp: 'T1567.002 Exfil to Cloud',     sev: 'high'     },
      { fid: 'TI-3013', s: 'CrowdStrike Intel',  ind: '203.0.113.45',                  ta: 'INDRIK SPIDER',          ttp: 'T1071.001 Web Protocols',      sev: 'high'     },
      { fid: 'TI-3014', s: 'AlienVault OTX',     ind: 'md5:5d41402abc4b2a76b9719d911017c592', ta: 'Generic commodity', ttp: 'T1204.002 Malicious File', sev: 'medium'   },
      { fid: 'TI-3015', s: 'Internal SOC TI',    ind: '10.60.12.114 → 185.220.101.45', ta: 'Internal hunt',          ttp: 'T1041 Exfil over C2 Channel',  sev: 'high'     },
    ];
    for (const f of feeds) {
      await client.query(
        `INSERT INTO threat_intel_feed (feed_id, source, indicator, threat_actor, ttp, observed_at, severity)
         VALUES ($1,$2,$3,$4,$5, NOW() - INTERVAL '${Math.floor(Math.random()*72)+1} hours', $6)`,
        [f.fid, f.s, f.ind, f.ta, f.ttp, f.sev]
      );
    }
    console.log(`Inserted ${feeds.length} threat intel entries.`);

    // -------- shift_roster --------
    const roster = [
      { eid: 'SR-001', a: 'aria.lopez',    sh: 'Day',     d: 'Monday',    oc: false },
      { eid: 'SR-002', a: 'kavin.rao',     sh: 'Day',     d: 'Tuesday',   oc: false },
      { eid: 'SR-003', a: 'priya.shah',    sh: 'Day',     d: 'Wednesday', oc: false },
      { eid: 'SR-004', a: 'sam.becker',    sh: 'Day',     d: 'Thursday',  oc: false },
      { eid: 'SR-005', a: 'mei.tanaka',    sh: 'Day',     d: 'Friday',    oc: false },
      { eid: 'SR-006', a: 'nikolai.orlov', sh: 'Evening', d: 'Monday',    oc: true  },
      { eid: 'SR-007', a: 'fatima.haidar', sh: 'Evening', d: 'Tuesday',   oc: false },
      { eid: 'SR-008', a: 'derek.young',   sh: 'Evening', d: 'Wednesday', oc: false },
      { eid: 'SR-009', a: 'lena.müller',   sh: 'Evening', d: 'Thursday',  oc: true  },
      { eid: 'SR-010', a: 'tariq.osei',    sh: 'Evening', d: 'Friday',    oc: false },
      { eid: 'SR-011', a: 'rosa.fernandez',sh: 'Night',   d: 'Monday',    oc: true  },
      { eid: 'SR-012', a: 'jared.kim',     sh: 'Night',   d: 'Tuesday',   oc: false },
      { eid: 'SR-013', a: 'isobel.frost',  sh: 'Night',   d: 'Wednesday', oc: false },
      { eid: 'SR-014', a: 'omar.salah',    sh: 'Night',   d: 'Thursday',  oc: true  },
      { eid: 'SR-015', a: 'yuki.sato',     sh: 'Night',   d: 'Friday',    oc: false },
    ];
    for (const r of roster) {
      await client.query(
        `INSERT INTO shift_roster (entry_id, analyst, shift, day_of_week, on_call) VALUES ($1,$2,$3,$4,$5)`,
        [r.eid, r.a, r.sh, r.d, r.oc]
      );
    }
    console.log(`Inserted ${roster.length} roster entries.`);

    // -------- audit_log --------
    const audit = [
      { lid: 'AUD-0001', a: 'aria.lopez',    ac: 'isolated_host',         t: 'file-srv-02',         r: 'success' },
      { lid: 'AUD-0002', a: 'system:soar',   ac: 'blocked_ioc',           t: '185.220.101.45',      r: 'success' },
      { lid: 'AUD-0003', a: 'kavin.rao',     ac: 'closed_alert',          t: 'ALR-0013',            r: 'success' },
      { lid: 'AUD-0004', a: 'priya.shah',    ac: 'opened_incident',       t: 'INC-2003',            r: 'success' },
      { lid: 'AUD-0005', a: 'sam.becker',    ac: 'ran_playbook',          t: 'PB-107',              r: 'success' },
      { lid: 'AUD-0006', a: 'system:edr',    ac: 'auto_quarantine',       t: 'finance-vm-09',       r: 'success' },
      { lid: 'AUD-0007', a: 'aria.lopez',    ac: 'reset_credentials',     t: 'okta:user:m.chen',    r: 'success' },
      { lid: 'AUD-0008', a: 'kavin.rao',     ac: 'attempted_delete_ioc',  t: 'IOC-010',             r: 'denied'  },
      { lid: 'AUD-0009', a: 'priya.shah',    ac: 'updated_playbook',      t: 'PB-104',              r: 'success' },
      { lid: 'AUD-0010', a: 'system:scim',   ac: 'role_added',            t: 'azuread:role:Security Reader', r: 'success' },
      { lid: 'AUD-0011', a: 'sam.becker',    ac: 'queried_siem',          t: 'splunk:index=edr',    r: 'success' },
      { lid: 'AUD-0012', a: 'aria.lopez',    ac: 'escalated_incident',    t: 'INC-2015',            r: 'success' },
      { lid: 'AUD-0013', a: 'mei.tanaka',    ac: 'export_audit_log',      t: 'audit_log',           r: 'success' },
      { lid: 'AUD-0014', a: 'system:tipfeed',ac: 'ingest_ti',             t: 'TI-3008',             r: 'success' },
      { lid: 'AUD-0015', a: 'priya.shah',    ac: 'login_failed',          t: 'soc-portal',          r: 'failed'  },
    ];
    for (const r of audit) {
      await client.query(
        `INSERT INTO audit_log (log_id, actor, action, target, timestamp, result)
         VALUES ($1,$2,$3,$4, NOW() - INTERVAL '${Math.floor(Math.random()*120)+1} minutes', $5)`,
        [r.lid, r.a, r.ac, r.t, r.r]
      );
    }
    console.log(`Inserted ${audit.length} audit log entries.`);

    // ============================================================
    // 10 NEW CRUD entities, 15 rows each
    // ============================================================

    // 1. vulnerabilities
    const vulns = [
      ['CVE-2024-23897', 9.8, 'jenkins-prod-01',  'open',      30],
      ['CVE-2023-46604', 9.8, 'activemq-broker',  'patching',  3],
      ['CVE-2021-44228', 10.0,'web-edge-01',      'mitigated', null],
      ['CVE-2022-30190', 7.8, 'corp-wks-114',     'open',      14],
      ['CVE-2023-4863',  8.8, 'corp-wks-203',     'patching',  2],
      ['CVE-2024-3094',  10.0,'jumphost-01',      'open',      7],
      ['CVE-2023-22515', 9.8, 'confluence-01',    'mitigated', null],
      ['CVE-2023-50164', 9.8, 'struts-svc-02',    'patching',  5],
      ['CVE-2024-21413', 9.8, 'outlook-gw',       'open',      10],
      ['CVE-2024-1709',  10.0,'screenconnect-01', 'accepted',  null],
      ['CVE-2023-34362', 9.8, 'moveit-01',        'mitigated', null],
      ['CVE-2024-21762', 9.6, 'fortigate-01',     'patching',  1],
      ['CVE-2023-20198', 10.0,'cisco-iosxe-01',   'open',      14],
      ['CVE-2022-22965', 9.8, 'spring-svc-04',    'mitigated', null],
      ['CVE-2024-3400',  10.0,'panos-fw-01',      'patching',  2],
    ];
    for (const v of vulns) {
      await client.query(
        `INSERT INTO vulnerabilities (cve, cvss, asset, status, discovered_at, patch_eta)
         VALUES ($1,$2,$3,$4, NOW() - INTERVAL '${Math.floor(Math.random()*30)+1} days', ${v[4] === null ? 'NULL' : `NOW() + INTERVAL '${v[4]} days'`})`,
        [v[0], v[1], v[2], v[3]]
      );
    }
    console.log(`Inserted ${vulns.length} vulnerabilities.`);

    // 2. exceptions
    const excs = [
      ['EX-001', 'NIST 800-53 AC-2',    'identity',      'Service account requires no MFA - automated',         180, 'active'],
      ['EX-002', 'PCI DSS 8.3.1',       'finance',       'Legacy POS terminal cannot support MFA',              90,  'active'],
      ['EX-003', 'ISO 27001 A.12.6.1',  'it-ops',        'Cannot patch SCADA system without OEM approval',      365, 'active'],
      ['EX-004', 'NIST 800-53 SI-2',    'platform-eng',  'CVE deferred - mitigated via WAF rule',               60,  'active'],
      ['EX-005', 'PCI DSS 11.4',        'secops',        'IDS sensor blind to encrypted east-west',             120, 'active'],
      ['EX-006', 'SOC 2 CC6.6',         'cloud-sec',     'AWS service role over-permissioned (vendor scope)',   30,  'expired'],
      ['EX-007', 'NIST 800-53 CM-8',    'it-ops',        'OT inventory partial - vendor sync pending',          180, 'active'],
      ['EX-008', 'CIS 5.3',             'identity',      'Admin password rotation manual',                       60,  'active'],
      ['EX-009', 'ISO 27001 A.9.4.2',   'engineering',   'Dev shared kubeconfig - sandbox cluster only',         45,  'expired'],
      ['EX-010', 'HIPAA 164.312(a)',    'data-platform', 'Encryption-at-rest disabled for analytics warm tier', 90,  'active'],
      ['EX-011', 'NIST 800-53 AU-12',   'platform-eng',  'Audit log retention 90d (not 365d) for cost',         180, 'active'],
      ['EX-012', 'PCI DSS 6.5.1',       'engineering',   'Legacy injection pattern in batch job',                30,  'active'],
      ['EX-013', 'SOC 2 CC7.2',         'secops',        'Penetration test deferred 1 quarter',                  90,  'active'],
      ['EX-014', 'NIST 800-53 SC-7',    'network',       'DMZ host requires inbound 23 (telnet) for OEM',       365, 'active'],
      ['EX-015', 'ISO 27001 A.17.1.2',  'ir',            'DR drill skipped Q3 - executive approval',             60,  'expired'],
    ];
    for (const e of excs) {
      await client.query(
        `INSERT INTO exceptions (exception_id, control, owner, justification, expires_at, status)
         VALUES ($1,$2,$3,$4, NOW() + INTERVAL '${e[4]} days', $5)`,
        [e[0], e[1], e[2], e[3], e[5]]
      );
    }
    console.log(`Inserted ${excs.length} exceptions.`);

    // 3. change_requests
    const crs = [
      ['CR-5001', 'Patch OpenSSL on web tier',                'aria.lopez',  'low',    'approved',    'sam.becker'],
      ['CR-5002', 'Enable WAF rule 942100 globally',          'kavin.rao',   'medium', 'implemented', 'sam.becker'],
      ['CR-5003', 'Rotate prod DB master credentials',        'priya.shah',  'high',   'submitted',   null],
      ['CR-5004', 'Decommission jenkins-old-01',              'aria.lopez',  'medium', 'approved',    'priya.shah'],
      ['CR-5005', 'Add new VPC subnet for k8s-prod',          'sam.becker',  'low',    'implemented', 'priya.shah'],
      ['CR-5006', 'Upgrade Splunk to 9.2.1',                  'kavin.rao',   'medium', 'submitted',   null],
      ['CR-5007', 'Migrate file-srv-02 to file-srv-03',       'aria.lopez',  'high',   'approved',    'sam.becker'],
      ['CR-5008', 'Tighten Okta MFA policy for admins',       'priya.shah',  'medium', 'implemented', 'sam.becker'],
      ['CR-5009', 'Block legacy auth in M365',                'kavin.rao',   'high',   'submitted',   null],
      ['CR-5010', 'Enable S3 block-public-access org-wide',   'sam.becker',  'low',    'implemented', 'priya.shah'],
      ['CR-5011', 'Deploy new EDR sensor to OT segment',      'aria.lopez',  'medium', 'approved',    'priya.shah'],
      ['CR-5012', 'Add SAML SP for HRIS',                     'priya.shah',  'low',    'submitted',   null],
      ['CR-5013', 'Patch panos-fw-01 to 11.1.2-h3',           'sam.becker',  'high',   'approved',    'aria.lopez'],
      ['CR-5014', 'Retire legacy AD CA',                      'kavin.rao',   'high',   'submitted',   null],
      ['CR-5015', 'Increase CloudTrail retention to 2y',      'aria.lopez',  'low',    'implemented', 'priya.shah'],
    ];
    for (const c of crs) {
      await client.query(
        `INSERT INTO change_requests (cr_id, summary, requester, risk, status, approved_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6, NOW() - INTERVAL '${Math.floor(Math.random()*20)+1} days')`,
        c
      );
    }
    console.log(`Inserted ${crs.length} change requests.`);

    // 4. vendor_risk
    const vendors = [
      ['VND-001', 'Okta Inc.',               'critical', true,  60,  18, 'active'],
      ['VND-002', 'CrowdStrike Holdings',    'critical', true,  90,  22, 'active'],
      ['VND-003', 'Snowflake Inc.',          'critical', true,  120, 25, 'active'],
      ['VND-004', 'AWS',                     'critical', true,  30,  15, 'active'],
      ['VND-005', 'Microsoft Azure',         'critical', true,  45,  17, 'active'],
      ['VND-006', 'Atlassian',               'high',     true,  180, 40, 'active'],
      ['VND-007', 'GitHub',                  'high',     true,  90,  28, 'active'],
      ['VND-008', 'Datadog',                 'high',     true,  100, 32, 'active'],
      ['VND-009', 'Slack Technologies',      'high',     true,  150, 35, 'active'],
      ['VND-010', 'Zoom Video',              'medium',   true,  200, 45, 'active'],
      ['VND-011', 'HubSpot',                 'medium',   true,  240, 50, 'active'],
      ['VND-012', 'Acme Legacy Bills Inc.',  'low',      false, 400, 78, 'review'],
      ['VND-013', 'TinyDev Consulting',      'low',      false, 365, 82, 'review'],
      ['VND-014', 'OldFax Solutions',        'low',      false, 540, 90, 'inactive'],
      ['VND-015', 'Promatrix Analytics',     'medium',   false, 270, 65, 'active'],
    ];
    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendor_risk (vendor_id, name, tier, soc2, last_review, risk_score, status)
         VALUES ($1,$2,$3,$4, NOW() - INTERVAL '${v[4]} days', $5, $6)`,
        [v[0], v[1], v[2], v[3], v[5], v[6]]
      );
    }
    console.log(`Inserted ${vendors.length} vendor risk entries.`);

    // 5. certificates
    const certs = [
      ['CERT-001', 'www.socops.io',           'DigiCert SHA2 G3',    60,  'active',   'platform-eng'],
      ['CERT-002', 'api.socops.io',           'DigiCert SHA2 G3',    45,  'active',   'platform-eng'],
      ['CERT-003', 'auth.socops.io',          'Lets Encrypt R3',     20,  'expiring', 'identity'],
      ['CERT-004', 'vpn.socops.io',           'GoDaddy G2',          90,  'active',   'network'],
      ['CERT-005', 'mail.socops.io',          'DigiCert SHA2 G3',    -10, 'expired',  'it-ops'],
      ['CERT-006', '*.dev.socops.io',         'Lets Encrypt R3',     14,  'expiring', 'engineering'],
      ['CERT-007', 'corp-rootca-2019',        'Internal CA',         900, 'active',   'identity'],
      ['CERT-008', 'finance-portal.socops.io','Sectigo RSA Org',     180, 'active',   'finance'],
      ['CERT-009', 'partner-edi.socops.io',   'GlobalSign DV',       -45, 'expired',  'platform-eng'],
      ['CERT-010', 'k8s-ingress.socops.io',   'cert-manager R3',     30,  'active',   'platform-eng'],
      ['CERT-011', 'okta-mtls.socops.io',     'Internal CA',         120, 'active',   'identity'],
      ['CERT-012', 'monitoring.socops.io',    'Lets Encrypt R3',     25,  'active',   'secops'],
      ['CERT-013', 'old-legacy.socops.io',    'GoDaddy G2',          -120,'expired',  'it-ops'],
      ['CERT-014', 'support.socops.io',       'DigiCert SHA2 G3',    75,  'active',   'platform-eng'],
      ['CERT-015', 'staging.socops.io',       'Lets Encrypt R3',     7,   'expiring', 'engineering'],
    ];
    for (const c of certs) {
      await client.query(
        `INSERT INTO certificates (cert_id, common_name, issuer, expires_at, status, owner)
         VALUES ($1,$2,$3, NOW() + INTERVAL '${c[3]} days', $4, $5)`,
        [c[0], c[1], c[2], c[4], c[5]]
      );
    }
    console.log(`Inserted ${certs.length} certificates.`);

    // 6. secrets_vault
    const secrets = [
      ['SEC-001', 'aws-prod-deploy-key',       'aws:prod',      'platform-eng', 30,  60,  'cicd-runner-01'],
      ['SEC-002', 'datadog-api-key',           'observability', 'secops',       60,  120, 'datadog-agent'],
      ['SEC-003', 'splunk-hec-token',          'siem',          'secops',       45,  90,  'log-shipper'],
      ['SEC-004', 'okta-api-token',            'identity',      'identity',     90,  180, 'scim-sync'],
      ['SEC-005', 'github-app-private-key',    'cicd',          'platform-eng', 180, 365, 'gh-actions'],
      ['SEC-006', 'snowflake-warehouse-key',   'data-platform', 'data-platform',30,  60,  'dbt-runner'],
      ['SEC-007', 'stripe-secret-key',         'payments',      'finance',      60,  120, 'finance-api'],
      ['SEC-008', 'sendgrid-api-key',          'email',         'platform-eng', 90,  180, 'notify-svc'],
      ['SEC-009', 'pagerduty-routing-key',     'oncall',        'secops',       365, 730, 'alert-router'],
      ['SEC-010', 'jira-bot-token',            'ticketing',     'platform-eng', 45,  90,  'ir-automation'],
      ['SEC-011', 'slack-bot-token',           'chatops',       'platform-eng', 60,  120, 'soc-bot'],
      ['SEC-012', 'azure-sp-secret',           'azure:prod',    'cloud-sec',    20,  -5,  'iac-deployer'],
      ['SEC-013', 'gcp-service-account-json',  'gcp:analytics', 'data-platform',45,  90,  'bq-loader'],
      ['SEC-014', 'twilio-auth-token',         'voice-sms',     'platform-eng', 90,  180, 'verify-svc'],
      ['SEC-015', 'mongo-atlas-uri',           'data',          'data-platform',30,  60,  'app-svc-prod'],
    ];
    for (const s of secrets) {
      await client.query(
        `INSERT INTO secrets_vault (secret_id, name, scope, owner, last_rotated, rotation_due, used_by)
         VALUES ($1,$2,$3,$4, NOW() - INTERVAL '${s[4]} days', NOW() + INTERVAL '${s[5]} days', $5)`,
        [s[0], s[1], s[2], s[3], s[6]]
      );
    }
    console.log(`Inserted ${secrets.length} vault secrets.`);

    // 7. runbooks
    const runbooks = [
      ['RB-001', 'Ransomware Outbreak',           'Mass file encryption detected',          14, 'ir',       'active'],
      ['RB-002', 'Wide-Scale Phishing Wave',      'Phishing volume > 5x baseline',          30, 'secops',   'active'],
      ['RB-003', 'Identity Provider Outage',      'Okta tenant unreachable',                60, 'identity', 'active'],
      ['RB-004', 'Cloud Key Compromise',          'GuardDuty Credential Exfil',             45, 'cloud-sec','active'],
      ['RB-005', 'DDoS Edge Saturation',          'Edge >80% utilization 5m',               21, 'network',  'active'],
      ['RB-006', 'Database Exfil',                'Anomalous bulk query export',            90, 'ir',       'active'],
      ['RB-007', 'Source Code Leak',              'Public repo with internal name',         120, 'secops',  'active'],
      ['RB-008', 'Backup Server Compromise',      'Backup integrity check fail',            60, 'it-ops',   'active'],
      ['RB-009', 'Insider Threat Termination',    'HR offboarding high-risk user',          75, 'identity', 'active'],
      ['RB-010', 'Critical CVE Released',         'CVSS >= 9.5 affecting our stack',        15, 'platform', 'active'],
      ['RB-011', 'Cobalt Strike Beacon',          'EDR pattern match',                      50, 'ir',       'active'],
      ['RB-012', 'Privileged Role Abuse',         'PIM anomaly',                            40, 'cloud-sec','active'],
      ['RB-013', 'Supply Chain Compromise',       'Vendor breach notice',                   180, 'secops',  'draft'],
      ['RB-014', 'OT/ICS Anomaly',                'OT sensor unexpected command',           365, 'ir',      'draft'],
      ['RB-015', 'Legacy Web Defacement',         'Static page hash drift',                 240, 'it-ops',  'retired'],
    ];
    for (const r of runbooks) {
      await client.query(
        `INSERT INTO runbooks (runbook_id, name, scenario, last_drill, owner, status)
         VALUES ($1,$2,$3, NOW() - INTERVAL '${r[3]} days', $4, $5)`,
        [r[0], r[1], r[2], r[4], r[5]]
      );
    }
    console.log(`Inserted ${runbooks.length} runbooks.`);

    // 8. evidence_library
    const evs = [
      ['EV-001', 'NIST AC-2',     'screenshot', 'aria.lopez',  365],
      ['EV-002', 'PCI 11.4',      'log',        'system:siem', 90],
      ['EV-003', 'SOC2 CC6.1',    'report',     'priya.shah',  365],
      ['EV-004', 'ISO A.9.4.2',   'cert',       'sam.becker',  730],
      ['EV-005', 'NIST AU-12',    'log',        'system:siem', 365],
      ['EV-006', 'HIPAA 164.312', 'screenshot', 'kavin.rao',   180],
      ['EV-007', 'NIST CM-8',     'report',     'aria.lopez',  365],
      ['EV-008', 'PCI 8.3.1',     'screenshot', 'priya.shah',  180],
      ['EV-009', 'SOC2 CC7.2',    'report',     'sam.becker',  365],
      ['EV-010', 'NIST IR-4',     'log',        'system:soar', 365],
      ['EV-011', 'ISO A.12.6.1',  'report',     'aria.lopez',  365],
      ['EV-012', 'CIS 5.3',       'screenshot', 'priya.shah',  180],
      ['EV-013', 'NIST SC-7',     'cert',       'sam.becker',  730],
      ['EV-014', 'SOC2 CC6.6',    'log',        'system:siem', 365],
      ['EV-015', 'NIST SI-2',     'report',     'aria.lopez',  365],
    ];
    for (const e of evs) {
      await client.query(
        `INSERT INTO evidence_library (evidence_id, control, type, collected_at, collected_by, valid_until)
         VALUES ($1,$2,$3, NOW() - INTERVAL '${Math.floor(Math.random()*60)+1} days', $4, NOW() + INTERVAL '${e[4]} days')`,
        [e[0], e[1], e[2], e[3]]
      );
    }
    console.log(`Inserted ${evs.length} evidence entries.`);

    // 9. allowlists
    const allows = [
      ['AL-001', 'ip',     '54.231.0.0/17',          'aws-s3-egress',     'AWS S3 us-east-1 prefix list',           'sam.becker', 365],
      ['AL-002', 'domain', 'updates.datadoghq.com',  'agent-egress',      'Datadog agent updates',                  'secops',     365],
      ['AL-003', 'domain', 'snyk.io',                'cicd',              'Snyk vulnerability scanning',            'platform',   180],
      ['AL-004', 'ip',     '34.96.0.0/20',           'gcp-corp',          'GCP corp VPC peering',                   'cloud-sec',  365],
      ['AL-005', 'domain', 'pkg.github.com',         'cicd',              'GitHub Packages CDN',                    'platform',   365],
      ['AL-006', 'hash',   'sha256:aaaa1111...',     'internal-binary',   'Approved internal admin tool',           'secops',     180],
      ['AL-007', 'domain', 'oktacdn.com',            'identity-egress',   'Okta sign-in widget CDN',                'identity',   365],
      ['AL-008', 'ip',     '203.0.113.50',           'vendor-vpn',        'Acme support tunnel endpoint',           'network',    90],
      ['AL-009', 'domain', '*.slack-edge.com',       'chatops-egress',    'Slack media CDN',                        'platform',   365],
      ['AL-010', 'domain', 'sentry.io',              'observability',     'Error tracking',                         'platform',   180],
      ['AL-011', 'ip',     '52.84.0.0/15',           'aws-cloudfront',    'CloudFront edges',                       'platform',   365],
      ['AL-012', 'hash',   'sha256:bbbb2222...',     'soar-runner',       'SOAR scripts hash',                      'secops',     180],
      ['AL-013', 'domain', 'pypi.org',               'dev-egress',        'Python packages',                        'engineering',365],
      ['AL-014', 'ip',     '185.199.108.0/22',       'github-pages',      'GitHub Pages',                           'engineering',365],
      ['AL-015', 'domain', 'auth0.com',              'identity-egress',   'Auth0 broker (transitional)',            'identity',   60],
    ];
    for (const a of allows) {
      await client.query(
        `INSERT INTO allowlists (entry_id, type, value, scope, justification, added_by, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '${a[6]} days')`,
        [a[0], a[1], a[2], a[3], a[4], a[5]]
      );
    }
    console.log(`Inserted ${allows.length} allowlist entries.`);

    // 10. blocklists
    const blocks = [
      ['BL-001', 'ip',     '185.220.101.45',                            'Mandiant',     'critical', 'active'],
      ['BL-002', 'ip',     '45.155.205.233',                            'CrowdStrike',  'high',     'active'],
      ['BL-003', 'domain', 'updates-microsoft-cdn.com',                 'OTX',          'high',     'active'],
      ['BL-004', 'domain', 'login-microsoftonline.support-secure.com',  'PhishTank',    'critical', 'active'],
      ['BL-005', 'hash',   'sha256:9b74c989...',                        'VirusTotal',   'critical', 'active'],
      ['BL-006', 'ip',     '141.98.10.122',                             'GreyNoise',    'medium',   'active'],
      ['BL-007', 'domain', 'cdn-statics-akmai.net',                     'Mandiant',     'high',     'active'],
      ['BL-008', 'ip',     '203.0.113.45',                              'Internal SOC', 'high',     'active'],
      ['BL-009', 'domain', 'paste.ee.suspicious-mirror.ru',             'OSINT',        'medium',   'active'],
      ['BL-010', 'hash',   'md5:5d41402abc4b2a76b9719d911017c592',      'OTX',          'medium',   'active'],
      ['BL-011', 'domain', 'malicious-cdn.example',                     'Internal SOC', 'low',      'expired'],
      ['BL-012', 'ip',     '198.51.100.7',                              'Talos Intel',  'high',     'active'],
      ['BL-013', 'domain', 'phish-banking-alert.tk',                    'PhishTank',    'critical', 'active'],
      ['BL-014', 'ip',     '198.51.100.45',                             'AbuseIPDB',    'medium',   'active'],
      ['BL-015', 'hash',   'sha256:44d88612fea8a8...',                  'Hybrid Analysis','high',   'active'],
    ];
    for (const b of blocks) {
      await client.query(
        `INSERT INTO blocklists (entry_id, type, value, source, severity, added_at, status)
         VALUES ($1,$2,$3,$4,$5, NOW() - INTERVAL '${Math.floor(Math.random()*60)+1} days', $6)`,
        b
      );
    }
    console.log(`Inserted ${blocks.length} blocklist entries.`);

    // -------- sample notifications --------
    const notes = [
      [null, 'system',   'Welcome to the new AI CyberSOC Copilot. Demo users: admin/analyst/viewer.'],
      [1,    'security', 'Critical alert ALR-0001 triggered on file-srv-02.'],
      [1,    'security', 'Cobalt Strike beacon detected on finance-vm-09.'],
      [2,    'task',     'Open incident INC-2002 assigned to you.'],
      [2,    'task',     'Phishing campaign INC-2007 needs triage.'],
    ];
    for (const n of notes) {
      await client.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)`,
        n
      );
    }
    console.log(`Inserted ${notes.length} notifications.`);

    console.log('\n✓ Seed complete.\n');
  } catch (e) {
    console.error('Seed error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
