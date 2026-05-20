const { buildCrudRouter } = require('../services/crud_factory');

module.exports = buildCrudRouter({
  table: 'certificates',
  columns: ['cert_id', 'common_name', 'issuer', 'expires_at', 'status', 'owner'],
  orderBy: 'expires_at ASC',
  idPrefix: 'CERT',
});
