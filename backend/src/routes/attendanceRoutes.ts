import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

// Student marks attendance with GPS geofencing & biometric verification
router.post('/mark', authenticate, requireRole('student'), AttendanceController.markAttendance);

// Student gets their attendance history
router.get('/history/student', authenticate, requireRole('student'), AttendanceController.getStudentHistory);

export default router;

