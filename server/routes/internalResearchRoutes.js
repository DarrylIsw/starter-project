const express = require('express');
const controller = require('../controllers/internalResearchController');

const router = express.Router();

router.get('/schemes', controller.listSchemes);
router.get('/drafts', controller.listDrafts);

module.exports = router;
