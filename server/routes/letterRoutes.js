const express = require('express');
const controller = require('../controllers/letterController');

const router = express.Router();

router.get('/', controller.listLetters);

module.exports = router;
