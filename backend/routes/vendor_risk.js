const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'vendor_risk',
  columns: ['vendor_id', 'name', 'tier', 'soc2', 'last_review', 'risk_score', 'status'],
  orderBy: 'risk_score DESC',
  idPrefix: 'VND',
});
