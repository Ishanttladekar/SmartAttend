import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { AuthenticatedRequest } from '../types/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateNonce } from '../utils/nonce.js';
import { isValidCoordinate } from '../utils/geo.js';
import { emitSessionStarted, emitSessionEnded } from '../socket/index.js';

export const startSessionSchema = z.object({
  classroomId: z.string().min(1, 'Classroom ID is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100).optional().default(10),
  allowedRadiusMeters: z.number().min(5).max(100).optional().default(25),
  address: z.string().optional(),
});

export class SessionController {
  /**
   * Teacher starts a new attendance session
   */
  static async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = startSessionSchema.parse(req.body);
      const teacherId = new mongoose.Types.ObjectId(req.user!.userId);

      const classroom = await Classroom.findOne({
        _id: new mongoose.Types.ObjectId(data.classroomId),
        teacherId,
        isActive: true,
      });

      if (!classroom) {
        errorResponse(res, 'Classroom not found or unauthorized', 404);
        return;
      }

      if (!isValidCoordinate(data.latitude, data.longitude)) {
        errorResponse(res, 'Invalid GPS coordinates provided', 400);
        return;
      }

      // Check if an active session already exists
      const existingSession = await AttendanceSession.findOne({
        classroomId: classroom._id,
        status: 'ACTIVE',
      });

      if (existingSession) {
        successResponse(
          res,
          existingSession,
          'An attendance session is already active for this classroom',
          200
        );
        return;
      }

      const sessionCode = `SES-${Date.now().toString().slice(-6)}`;
      const sessionNonce = generateNonce(24);

      const session = await AttendanceSession.create({
        classroomId: classroom._id,
        teacherId,
        sessionCode,
        startTime: new Date(),
        status: 'ACTIVE',
        authorizedLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy || 10,
          address: data.address || '',
        },
        allowedRadiusMeters: data.allowedRadiusMeters || 25,
        sessionNonce,
      });

      // Emit real-time session started event
      emitSessionStarted(classroom._id.toString(), {
        sessionId: session._id,
        classroomId: classroom._id,
        subjectName: classroom.subjectName,
        startTime: session.startTime,
        allowedRadiusMeters: session.allowedRadiusMeters,
      });

      successResponse(res, session, 'Attendance session started successfully', 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Failed to start session', 500);
    }
  }

  /**
   * Teacher stops an attendance session
   */
  static async stopSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = new mongoose.Types.ObjectId(req.user!.userId);

      const session = await AttendanceSession.findOne({
        _id: new mongoose.Types.ObjectId(id),
        teacherId,
      });

      if (!session) {
        errorResponse(res, 'Session not found or unauthorized', 404);
        return;
      }

      if (session.status !== 'ACTIVE') {
        errorResponse(res, `Session is already ${session.status.toLowerCase()}`, 400);
        return;
      }

      session.status = 'COMPLETED';
      session.endTime = new Date();
      await session.save();

      // Emit real-time session ended event
      emitSessionEnded(session._id.toString(), session.classroomId.toString());

      successResponse(res, session, 'Attendance session ended successfully');
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to stop session', 500);
    }
  }

  /**
   * Live attendance monitor: get session statistics and marked students in real time
   */
  static async getSessionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await AttendanceSession.findById(id).populate('classroomId');
      if (!session) {
        errorResponse(res, 'Session not found', 404);
        return;
      }

      const classroom = session.classroomId as any;

      // Total enrolled students
      const totalEnrolled = await ClassroomMember.countDocuments({
        classroomId: classroom._id,
      });

      // Attendance records for this session
      const records = await AttendanceRecord.find({ sessionId: session._id })
        .populate('studentId', 'name email')
        .sort({ timestamp: -1 });

      // Roll numbers for students
      const studentUserIds = records.map((r) => r.studentId._id);
      const profiles = await StudentProfile.find({ userId: { $in: studentUserIds } });
      const profileMap = new Map<string, any>();
      profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

      const presentList = records.map((r) => {
        const studentUser = r.studentId as any;
        const profile = profileMap.get(studentUser._id.toString());
        return {
          recordId: r._id,
          studentId: studentUser._id,
          name: studentUser.name,
          email: studentUser.email,
          rollNumber: profile?.rollNumber || 'N/A',
          timestamp: r.timestamp,
          distanceMeters: r.studentLocation.distanceMeters,
          accuracy: r.studentLocation.accuracy,
          verificationMethods: r.verificationMethods,
        };
      });

      const presentCount = records.length;
      const absentCount = Math.max(0, totalEnrolled - presentCount);

      const durationMinutes = Math.round(
        ((session.endTime ? session.endTime.getTime() : Date.now()) -
          session.startTime.getTime()) /
          (1000 * 60)
      );

      successResponse(res, {
        session: {
          id: session._id,
          code: session.sessionCode,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes,
          allowedRadiusMeters: session.allowedRadiusMeters,
          authorizedLocation: session.authorizedLocation,
          sessionNonce: session.sessionNonce,
        },
        classroom: {
          id: classroom._id,
          subjectName: classroom.subjectName,
          subjectCode: classroom.subjectCode,
          section: classroom.section,
        },
        stats: {
          totalEnrolled,
          presentCount,
          absentCount,
          attendancePercentage:
            totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0,
        },
        presentStudents: presentList,
      });
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch session status', 500);
    }
  }
}

