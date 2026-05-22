const express = require('express');
const router = express.Router();
const { login, register, getMe, updateProfile, updateProfileUrls, getAllFaculty, adminUpdateFaculty } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile-urls', protect, updateProfileUrls);
router.get('/faculty', protect, getAllFaculty);

// ✅ Admin — update any faculty profile
router.put('/admin/faculty/:id', protect, adminUpdateFaculty);
router.get('/faculty-list', protect, async (req, res) => {
  const pool = require('../config/database');
  try {
    const result = await pool.query('SELECT faculty_id, name FROM faculty ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching faculty list' });
  }
});
module.exports = router;