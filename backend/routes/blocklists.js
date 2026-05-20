const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'blocklists',
  columns: ['entry_id', 'type', 'value', 'source', 'severity', 'status'],
  orderBy: 'added_at DESC',
  idPrefix: 'BL',
});
