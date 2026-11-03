import express from 'express';
const router = express.Router();


import mapController from '../controllers/map-controller.js';


router.get('/:postalCode', mapController.fetchPostalCodeCoordinates);


export default router;