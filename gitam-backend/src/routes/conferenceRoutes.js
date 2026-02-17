
const express = require('express');
const router = express.Router();
const {
    getAllConferences,
    getConferencesByFaculty,
    createConference,
    updateConference,
    deleteConference
} = require('../controllers/conferenceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllConferences);
router.get('/faculty/:facultyId', getConferencesByFaculty);
router.post('/', createConference);
router.put('/:id', updateConference);
router.delete('/:id', deleteConference);

module.exports = router;