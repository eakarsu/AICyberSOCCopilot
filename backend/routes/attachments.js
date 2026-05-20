const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/database');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { owner_collection = 'misc', owner_id = '0' } = req.body || {};
    const actor = (req.user && (req.user.email || req.user.name)) || 'anonymous';
    const r = await pool.query(
      `INSERT INTO attachments
        (owner_collection, owner_id, filename, mime, size, uploaded_by, path)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [owner_collection, String(owner_id), req.file.originalname, req.file.mimetype, req.file.size, actor, req.file.filename]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attachments/:owner_collection/:owner_id
router.get('/attachments/:owner_collection/:owner_id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM attachments
       WHERE owner_collection=$1 AND owner_id=$2
       ORDER BY created_at DESC LIMIT 100`,
      [req.params.owner_collection, req.params.owner_id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attachments/file/:id  (stream the file)
router.get('/attachments/file/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM attachments WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const a = r.rows[0];
    const filePath = path.join(UPLOAD_DIR, a.path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });
    res.setHeader('Content-Type', a.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${a.filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attachments  (list all - admin debugging)
router.get('/attachments', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM attachments ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
