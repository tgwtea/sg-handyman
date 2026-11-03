import express from 'express';
const router = express.Router();


import companyController from '../controllers/company-controller.js';
import timeslotController from '../controllers/timeslot-controller.js';


router.get('/', companyController.getCompanies);
router.get('/:companyId', companyController.findCompanyById);
router.get('/:companyId/timeslots', timeslotController.getCompanyTimeslots);


export default router;