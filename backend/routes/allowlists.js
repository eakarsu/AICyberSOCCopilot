const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'allowlists',
  columns: ['entry_id', 'type', 'value', 'scope', 'justification', 'added_by', 'expires_at'],
  orderBy: 'id DESC',
  idPrefix: 'AL',
});
