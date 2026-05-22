const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/potentialFlagController');

router.get('/faculty/:facultyId', protect, ctrl.getByFaculty);
router.get('/all', protect, adminOnly, ctrl.getAll);
router.put('/:id/resolve', protect, ctrl.resolve);
router.post('/:id/escalate', protect, adminOnly, ctrl.escalate);

module.exports = router;