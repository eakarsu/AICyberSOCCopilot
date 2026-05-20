const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'evidence_library',
  columns: ['evidence_id', 'control', 'type', 'collected_by', 'valid_until'],
  orderBy: 'collected_at DESC',
  idPrefix: 'EV',
});
