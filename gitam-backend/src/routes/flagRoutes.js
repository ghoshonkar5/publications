const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createFlags,
    getAllFlags,
    getFlagsByItem,
    getFlagsByFaculty,
    markResolved,
    approveResolution,
    deleteFlag,
    reflagFlag,
} = require('../controllers/flagController');

const pool = require('../config/database');

router.use(protect);
router.post('/', createFlags);
router.get('/', getAllFlags);
router.get('/faculty/:facultyId', getFlagsByFaculty);
router.get('/item/:itemType/:itemId', getFlagsByItem);
router.put('/:flagId/resolve', markResolved);
router.put('/:flagId/approve', approveResolution);
router.delete('/:flagId', deleteFlag);

router.put('/:flagId/reflag', reflagFlag);  // ← not flagController.reflagFlag

router.get('/:flagId/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM flag_history WHERE flag_id = $1 ORDER BY reflagged_at ASC`,
      [req.params.flagId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching history' });
  }
});

module.exports = router;