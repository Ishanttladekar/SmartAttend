import { Router } from 'express';
import { ClassroomController } from '../controllers/classroomController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

// Teacher creates classroom
router.post('/', authenticate, requireRole('teacher'), ClassroomController.createClassroom);

// Teacher gets their classrooms
router.get('/teacher', authenticate, requireRole('teacher'), ClassroomController.getTeacherClassrooms);

// Student joins classroom
router.post('/join', authenticate, requireRole('student'), ClassroomController.joinClassroom);

// Student gets their joined classrooms
router.get('/student', authenticate, requireRole('student'), ClassroomController.getStudentClassrooms);

// Get single classroom details (teacher or enrolled student)
router.get('/:id', authenticate, ClassroomController.getClassroomDetails);

export default router;

