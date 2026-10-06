import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

// Teacher downloads official attendance PDF
router.get('/pdf/:classroomId', authenticate, requireRole('teacher'), ReportController.downloadPDFReport);

// Teacher gets classroom analytics
router.get('/classroom/:classroomId', authenticate, requireRole('teacher'), ReportController.getClassroomStats);

// Teacher dashboard overview
router.get('/dashboard/teacher', authenticate, requireRole('teacher'), ReportController.getTeacherDashboardOverview);

// Student gets attendance summary across all subjects
router.get('/dashboard/student', authenticate, requireRole('student'), ReportController.getStudentStats);

export default router;

