import express from 'express';
import authenticateToken from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import * as userController from '../controllers/user.controller';
import { csrfProtectionMiddleware } from '../app';

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, userController.list);
router.patch('/:id/activate', csrfProtectionMiddleware, authenticateToken, requireAdmin, userController.activate);
router.patch('/:id/deactivate', csrfProtectionMiddleware, authenticateToken, requireAdmin, userController.deactivate);
router.put('/:id', csrfProtectionMiddleware, authenticateToken, userController.update);
router.patch('/:id/password', csrfProtectionMiddleware, authenticateToken, userController.changePassword);
router.delete('/:id', csrfProtectionMiddleware, authenticateToken, requireAdmin, userController.remove);

export default router;
