import express from 'express';
const router = express.Router();

import authController from '../controllers/auth-controller.js';

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

export default router;
