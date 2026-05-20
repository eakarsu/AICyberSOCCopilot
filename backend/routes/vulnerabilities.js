const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'vulnerabilities',
  columns: ['cve', 'cvss', 'asset', 'status', 'patch_eta'],
  orderBy: 'discovered_at DESC',
  idPrefix: 'CVE',
});
