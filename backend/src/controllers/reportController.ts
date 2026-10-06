import { Response } from 'express';
import mongoose from 'mongoose';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AttendanceStatsService } from '../services/attendanceStatsService.js';
import { PDFService } from '../services/pdfService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export class ReportController {
  /**
   * Generates and downloads the official PDF attendance report for a classroom
   */
  static async downloadPDFReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { classroomId } = req.params;
      const teacherId = new mongoose.Types.ObjectId(req.user!.userId);

      const classroom = await Classroom.findOne({
        _id: new mongoose.Types.ObjectId(classroomId),
        teacherId,
      }).populate('teacherId', 'name email');

      if (!classroom) {
        errorResponse(res, 'Classroom not found or unauthorized', 404);
        return;
      }

      const summary = await AttendanceStatsService.getClassroomAttendanceSummary(classroomId);

      await PDFService.generateAttendancePDF(res, {
        institutionName: 'SMARTATTEND UNIVERSITY',
        classroom: {
          subjectName: classroom.subjectName,
          subjectCode: classroom.subjectCode,
          section: classroom.section,
          semester: classroom.semester,
          academicYear: classroom.academicYear,
          teacherName: (classroom.teacherId as any)?.name || 'Instructor',
        },
        totalSessions: summary.totalSessions,
        classAverage: summary.classAveragePercentage,
        students: summary.students,
      });
    } catch (error: any) {
      console.error('[PDF Generation Error]', error);
      if (!res.headersSent) {
        errorResponse(res, error.message || 'Failed to generate PDF report', 500);
      }
    }
  }

  /**
   * Gets classroom statistics breakdown for teacher dashboard
   */
  static async getClassroomStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { classroomId } = req.params;
      const summary = await AttendanceStatsService.getClassroomAttendanceSummary(classroomId);
      successResponse(res, summary);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to calculate stats', 500);
    }
  }

  /**
   * Gets overall student statistics for student dashboard
   */
  static async getStudentStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user!.userId;
      const summary = await AttendanceStatsService.getStudentOverallSummary(studentId);
      successResponse(res, summary);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to calculate student stats', 500);
    }
  }

  /**
   * Teacher high-level dashboard metrics
   */
  static async getTeacherDashboardOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const teacherId = new mongoose.Types.ObjectId(req.user!.userId);

      // 1. Total classrooms
      const classrooms = await Classroom.find({ teacherId, isActive: true });
      const classroomIds = classrooms.map((c) => c._id);

      // 2. Total unique students across all teacher's classrooms
      const memberships = await ClassroomMember.find({ classroomId: { $in: classroomIds } });
      const uniqueStudentIds = new Set(memberships.map((m) => m.studentId.toString()));

      // 3. Active session if any
      const activeSession = await AttendanceSession.findOne({
        teacherId,
        status: 'ACTIVE',
      }).populate('classroomId', 'subjectName subjectCode section');

      // 4. Today's sessions & attendance count
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todaySessions = await AttendanceSession.find({
        teacherId,
        startTime: { $gte: startOfDay },
      });

      const todaySessionIds = todaySessions.map((s) => s._id);
      const todayPresentCount = await AttendanceRecord.countDocuments({
        sessionId: { $in: todaySessionIds },
      });

      // 5. Total conducted sessions
      const totalSessionsConducted = await AttendanceSession.countDocuments({
        teacherId,
        status: { $in: ['ACTIVE', 'COMPLETED'] },
      });

      const totalAttendanceMarked = await AttendanceRecord.countDocuments({
        sessionId: {
          $in: await AttendanceSession.find({ teacherId }).distinct('_id'),
        },
      });

      successResponse(res, {
        totalClassrooms: classrooms.length,
        totalStudents: uniqueStudentIds.size,
        totalSessionsConducted,
        todayPresentCount,
        activeSession: activeSession
          ? {
              id: activeSession._id,
              classroomId: activeSession.classroomId,
              subjectName: (activeSession.classroomId as any)?.subjectName,
              subjectCode: (activeSession.classroomId as any)?.subjectCode,
              startTime: activeSession.startTime,
              allowedRadiusMeters: activeSession.allowedRadiusMeters,
            }
          : null,
      });
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch dashboard metrics', 500);
    }
  }
}

