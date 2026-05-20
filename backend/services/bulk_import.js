const multer = require('multer');
const { parse: csvParse } = require('csv-parse/sync');
const pool = require('../config/database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Mount a /bulk-import endpoint on `router` for table `table` with editable
 * columns `columns`. Use ON CONFLICT DO NOTHING so re-imports are safe.
 */
function attachBulkImport(router, table, columns, idPrefix) {
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
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
          if (idPrefix && columns[0].endsWith('_id') && !values[0]) {
            values[0] = `${idPrefix}-${Date.now()}-${inserted}`;
          }
          await pool.query(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
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
}

module.exports = { attachBulkImport };
