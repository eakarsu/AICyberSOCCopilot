const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'secrets_vault',
  columns: ['secret_id', 'name', 'scope', 'owner', 'last_rotated', 'rotation_due', 'used_by'],
  orderBy: 'rotation_due ASC',
  idPrefix: 'SEC',
});
