const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'runbooks',
  columns: ['runbook_id', 'name', 'scenario', 'last_drill', 'owner', 'status'],
  orderBy: 'id DESC',
  idPrefix: 'RB',
});
