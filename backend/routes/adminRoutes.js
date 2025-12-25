import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', AdminController.getAllUsers);
router.get('/users/pending', AdminController.getPendingUsers);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/roles', AdminController.getRoles);

export default router;