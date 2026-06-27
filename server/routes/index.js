const express = require('express');
const healthController = require('../controllers/healthController');
const internalResearchRoutes = require('./internalResearchRoutes');
const letterRoutes = require('./letterRoutes');
const externalResearchRoutes = require('./externalResearchRoutes');
const researcherProfileRoutes = require('./researcherProfileRoutes');

const router = express.Router();

router.get('/health', healthController.status);
router.use('/research', internalResearchRoutes);
router.use('/letters', letterRoutes);
router.use('/external-research', externalResearchRoutes);
router.use('/researcher-profiles', researcherProfileRoutes);

module.exports = router;
