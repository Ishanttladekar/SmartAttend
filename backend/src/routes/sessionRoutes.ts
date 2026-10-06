import { Router } from 'express';
import { SessionController } from '../controllers/sessionController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

// Teacher starts session
router.post('/start', authenticate, requireRole('teacher'), SessionController.startSession);

// Teacher stops session
router.post('/:id/stop', authenticate, requireRole('teacher'), SessionController.stopSession);

// Get live session status & real-time attendance monitor
router.get('/:id/status', authenticate, SessionController.getSessionStatus);

export default router;

