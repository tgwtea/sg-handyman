import express from 'express';
const router = express.Router();

// const express = require('express');
// const router = express.Router();

// const authMiddleware = require('../middleware/auth-middleware');
import companyController from '../controllers/company-controller.js';

// auth middleware: week 11, slide 32

router.get('/', companyController.getCompanies);
router.get('/:companyId', companyController.findCompanyById);


// module.exports = router;
export default router;