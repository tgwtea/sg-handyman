import express from 'express';
const router = express.Router();

// const express = require('express');
// const router = express.Router();

// const authMiddleware = require('../middleware/auth-middleware');
import mapController from '../controllers/map-controller.js';

// auth middleware: week 11, slide 32

router.get('/:postalCode', mapController.fetchPostalCodeCoordinates);


// module.exports = router;
export default router;