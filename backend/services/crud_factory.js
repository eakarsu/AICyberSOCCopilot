const express = require('express');
const pool = require('../config/database');
const multer = require('multer');
const { parse: csvParse } = require('csv-parse/sync');
const { fireWebhooks } = require('./webhook');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Build a generic CRUD + bulk-import router for a table.
 *
 * @param {Object} cfg
 * @param {string} cfg.table       SQL table name
 * @param {string[]} cfg.columns   editable columns (used for INSERT / UPDATE)
 * @param {string} cfg.orderBy     ORDER BY clause body (e.g. 'created_at DESC')
 * @param {string} cfg.idPrefix    optional auto-id prefix when first column ends with `_id`
 *                                 e.g. 'VLN' produces VLN-1737...
 */
function buildCrudRouter(cfg) {
  const router = express.Router();
  const { table, columns, orderBy = 'id DESC' } = cfg;
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
  const updateSet = columns.map((c, i) => `${c}=$${i + 1}`).join(',');

  // LIST
  router.get('/', async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT 500`);
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET ONE
  router.get('/:id', async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // CREATE
  router.post('/', async (req, res) => {
    try {
      const values = columns.map((c) => req.body[c] ?? null);
      // Generate ID if the first column matches *_id and was empty
      if (columns[0].endsWith('_id') && !values[0] && cfg.idPrefix) {
        values[0] = `${cfg.idPrefix}-${Date.now()}`;
      }
      const r = await pool.query(
        `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      // Fire webhooks for high-signal collections
      if (['incidents', 'alerts', 'vulnerabilities', 'blocklists'].includes(table)) {
        fireWebhooks(`${table}.created`, r.rows[0]).catch(() => {});
      }
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // UPDATE
  router.put('/:id', async (req, res) => {
    try {
      const values = columns.map((c) => req.body[c] ?? null);
      const r = await pool.query(
        `UPDATE ${table} SET ${updateSet} WHERE id=$${columns.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const r = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING *`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted', row: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // BULK IMPORT (CSV)
  router.post('/bulk-import', upload.single('file'), async (req, res) => {
    try {
      let csvText = '';
      if (req.file && req.file.buffer) csvText = req.file.buffer.toString('utf8');
      else if (typeof req.body === 'string') csvText = req.body;
      else if (req.body && typeof req.body.csv === 'string') csvText = req.body.csv;

      if (!csvText || !csvText.trim()) {
        return res.status(400).json({ error: 'CSV body or file required' });
      }
      const records = csvParse(csvText, { columns: true, skip_empty_lines: true, trim: true });
      let inserted = 0; const errors = [];
      for (const row of records) {
        try {
          const values = columns.map((c) => (row[c] === '' ? null : row[c] ?? null));
          if (columns[0].endsWith('_id') && !values[0] && cfg.idPrefix) {
            values[0] = `${cfg.idPrefix}-${Date.now()}-${inserted}`;
          }
          await pool.query(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})
             ON CONFLICT DO NOTHING`,
            values
          );
          inserted++;
        } catch (rowErr) {
          errors.push({ row, error: rowErr.message });
        }
      }
      res.json({ inserted, total: records.length, errors });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { buildCrudRouter };
