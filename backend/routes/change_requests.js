const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'change_requests',
  columns: ['cr_id', 'summary', 'requester', 'risk', 'status', 'approved_by'],
  orderBy: 'created_at DESC',
  idPrefix: 'CR',
});
