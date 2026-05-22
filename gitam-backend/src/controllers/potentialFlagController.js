const pool = require('../config/database');

// ── Helper: check a publication for missing fields and create potential flag ──
const WATCHED_FIELDS = ['title', 'journal', 'month_year'];

exports.autoCreateIfIncomplete = async (publicationId) => {
  try {
    const result = await pool.query(
      `SELECT title, journal, month_year FROM publications WHERE id = $1`,
      [publicationId]
    );
    if (result.rows.length === 0) return;

    const pub = result.rows[0];
    const missingFields = WATCHED_FIELDS.filter(f => !pub[f] || pub[f].toString().trim() === '');

    if (missingFields.length === 0) return;

    // Check if a potential flag already exists for this publication
    const existing = await pool.query(
      `SELECT id FROM potential_flags WHERE publication_id = $1 AND status = 'open'`,
      [publicationId]
    );
    if (existing.rows.length > 0) return;

    await pool.query(
      `INSERT INTO potential_flags (publication_id, missing_fields) VALUES ($1, $2)`,
      [publicationId, missingFields]
    );
    console.log(`[PotentialFlag] Created for pub id=${publicationId}, missing: ${missingFields.join(', ')}`);
  } catch (e) {
    console.warn('[PotentialFlag] autoCreateIfIncomplete error:', e.message);
  }
};

// ── GET /api/potential-flags/faculty/:facultyId ──
exports.getByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facResult = await pool.query(
      'SELECT id FROM faculty WHERE faculty_id = $1', [facultyId]
    );
    if (facResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Faculty not found' });

    const dbFacultyId = facResult.rows[0].id;

    const result = await pool.query(
      `SELECT pf.*, p.title, p.journal, p.month_year, p.academic_year
       FROM potential_flags pf
       JOIN publications p ON pf.publication_id = p.id
       WHERE p.faculty_id = $1 AND pf.status = 'open'
       ORDER BY pf.created_at DESC`,
      [dbFacultyId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getByFaculty error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/potential-flags/all (admin) ──
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pf.*, p.title, p.journal, p.month_year, p.academic_year,
              f.name as faculty_name, f.faculty_id as faculty_code
       FROM potential_flags pf
       JOIN publications p ON pf.publication_id = p.id
       JOIN faculty f ON p.faculty_id = f.id
       WHERE pf.status = 'open'
       ORDER BY pf.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/potential-flags/:id/resolve (faculty submits fix) ──
exports.resolve = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyNote } = req.body;

    if (!facultyNote || !facultyNote.trim())
      return res.status(400).json({ success: false, message: 'Please describe what you fixed.' });

    // Re-check if fields are actually filled now
    const pfResult = await pool.query(
      `SELECT pf.*, p.title, p.journal, p.month_year
       FROM potential_flags pf
       JOIN publications p ON pf.publication_id = p.id
       WHERE pf.id = $1`,
      [id]
    );
    if (pfResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Potential flag not found' });

    const { publication_id, missing_fields } = pfResult.rows[0];
    const pub = pfResult.rows[0];

    // Check which fields are still missing
    const stillMissing = missing_fields.filter(
      f => !pub[f] || pub[f].toString().trim() === ''
    );

    if (stillMissing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please fill in the missing fields first: ${stillMissing.join(', ')}`,
        stillMissing,
      });
    }

    const result = await pool.query(
      `UPDATE potential_flags
       SET status = 'resolved', faculty_note = $1, resolved_at = NOW()
       WHERE id = $2 RETURNING *`,
      [facultyNote.trim(), id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('resolve error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/potential-flags/:id/escalate (admin converts to real flag) ──
exports.escalate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const pfResult = await pool.query(
      `SELECT pf.*, p.title FROM potential_flags pf
       JOIN publications p ON pf.publication_id = p.id
       WHERE pf.id = $1`,
      [id]
    );
    if (pfResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Potential flag not found' });

    const pf = pfResult.rows[0];

    // Create real flag
    const flagResult = await pool.query(
      `INSERT INTO flags (item_type, item_id, reason, flagged_by)
       VALUES ('publication', $1, $2, 'Admin') RETURNING *`,
      [pf.publication_id, reason || `Missing fields: ${pf.missing_fields.join(', ')}`]
    );

    const realFlag = flagResult.rows[0];

    // Mark potential flag as escalated
    await pool.query(
      `UPDATE potential_flags SET status = 'escalated', escalated_flag_id = $1 WHERE id = $2`,
      [realFlag.id, id]
    );

    res.json({ success: true, data: realFlag });
  } catch (error) {
    console.error('escalate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};