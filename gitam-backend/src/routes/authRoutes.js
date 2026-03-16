const express = require('express');
const router = express.Router();
const { login, register, getMe, updateProfileUrls } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/me', protect, getMe);

// ✅ Update academic profile URLs (Google Scholar, Scopus, WoS)
router.put('/profile-urls', protect, updateProfileUrls);

module.exports = router;