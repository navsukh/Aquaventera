const express = require('express');
const router = express.Router();

const { getCsrfToken } = require('../middleware/csrf');

// returns cookie + token
router.get('/csrf', getCsrfToken);

module.exports = router;