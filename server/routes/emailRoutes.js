const express = require('express');
const controller = require('../controllers/emailController');
const { requireUser } = require('../middlewares/auth');

const router = express.Router();

router.get('/status', requireUser, controller.status);
router.post('/outbox', requireUser, controller.enqueue);

module.exports = router;
