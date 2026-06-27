const express = require('express');
const controller = require('../controllers/externalResearchController');

const router = express.Router();

router.get('/', controller.listReports);

module.exports = router;
