const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'exceptions',
  columns: ['exception_id', 'control', 'owner', 'justification', 'expires_at', 'status'],
  orderBy: 'id DESC',
  idPrefix: 'EX',
});
