const express = require('express');
const controller = require('../controllers/researcherProfileController');

const router = express.Router();

router.get('/', controller.listProfiles);

module.exports = router;
