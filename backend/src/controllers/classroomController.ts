import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AuthenticatedRequest } from '../types/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { generateJoinCode } from '../utils/nonce.js';

export const createClassroomSchema = z.object({
  subjectName: z.string().min(2, 'Subject name is required'),
  subjectCode: z.string().min(2, 'Subject code is required'),
  section: z.string().min(1, 'Section is required'),
  semester: z.number().int().min(1).max(12),
  academicYear: z.string().min(4, 'Academic year is required'),
  description: z.string().optional(),
});

export const joinClassroomSchema = z.object({
  joinCode: z.string().min(4, 'Valid join code is required'),
});

export class ClassroomController {
  /**
   * Teacher creates a new classroom
   */
  static async createClassroom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = createClassroomSchema.parse(req.body);
      const teacherId = req.user!.userId;

      // Generate unique join code
      let joinCode = generateJoinCode(6);
      let exists = await Classroom.findOne({ joinCode });
      while (exists) {
        joinCode = generateJoinCode(6);
        exists = await Classroom.findOne({ joinCode });
      }

      const classroom = await Classroom.create({
        teacherId: new mongoose.Types.ObjectId(teacherId),
        subjectName: data.subjectName.trim(),
        subjectCode: data.subjectCode.toUpperCase().trim(),
        section: data.section.trim(),
        semester: data.semester,
        academicYear: data.academicYear.trim(),
        description: data.description?.trim() || '',
        joinCode,
        isActive: true,
      });

      successResponse(res, classroom, 'Classroom created successfully', 201);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Failed to create classroom', 500);
    }
  }

  /**
   * Teacher gets all classrooms created by them
   */
  static async getTeacherClassrooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const teacherId = new mongoose.Types.ObjectId(req.user!.userId);
      const classrooms = await Classroom.find({ teacherId, isActive: true }).sort({ createdAt: -1 });

      const classroomListWithStats = await Promise.all(
        classrooms.map(async (c) => {
          const studentCount = await ClassroomMember.countDocuments({ classroomId: c._id });
          const activeSession = await AttendanceSession.findOne({
            classroomId: c._id,
            status: 'ACTIVE',
          });
          const totalSessions = await AttendanceSession.countDocuments({
            classroomId: c._id,
            status: { $in: ['ACTIVE', 'COMPLETED'] },
          });

          return {
            ...c.toObject(),
            studentCount,
            totalSessions,
            hasActiveSession: !!activeSession,
            activeSessionId: activeSession?._id || null,
          };
        })
      );

      successResponse(res, classroomListWithStats);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch classrooms', 500);
    }
  }

  /**
   * Get single classroom details with member list
   */
  static async getClassroomDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const classroom = await Classroom.findById(id).populate('teacherId', 'name email');

      if (!classroom) {
        errorResponse(res, 'Classroom not found', 404);
        return;
      }

      // If user is student, verify membership
      if (req.user!.role === 'student') {
        const isMember = await ClassroomMember.findOne({
          classroomId: classroom._id,
          studentId: new mongoose.Types.ObjectId(req.user!.userId),
        });
        if (!isMember) {
          errorResponse(res, 'You are not enrolled in this classroom', 403);
          return;
        }
      }

      // Fetch members
      const members = await ClassroomMember.find({ classroomId: classroom._id })
        .populate('studentId', 'name email')
        .sort({ joinedAt: 1 });

      const studentUserIds = members.map((m) => m.studentId._id);
      const profiles = await StudentProfile.find({ userId: { $in: studentUserIds } });
      const profileMap = new Map<string, any>();
      profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

      const studentList = members.map((m) => {
        const studentUser = m.studentId as any;
        const profile = profileMap.get(studentUser._id.toString());
        return {
          id: studentUser._id,
          name: studentUser.name,
          email: studentUser.email,
          rollNumber: profile?.rollNumber || 'N/A',
          joinedAt: m.joinedAt,
          isBiometricReady: !!profile?.faceDescriptor || (profile?.webAuthnCredentials || []).length > 0,
        };
      });

      // Check active session
      const activeSession = await AttendanceSession.findOne({
        classroomId: classroom._id,
        status: 'ACTIVE',
      });

      successResponse(res, {
        classroom,
        students: studentList,
        studentCount: studentList.length,
        activeSession: activeSession
          ? {
              id: activeSession._id,
              startTime: activeSession.startTime,
              allowedRadiusMeters: activeSession.allowedRadiusMeters,
              authorizedLocation: activeSession.authorizedLocation,
              sessionNonce: activeSession.sessionNonce,
            }
          : null,
      });
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch classroom details', 500);
    }
  }

  /**
   * Student joins classroom via 6-digit code or link
   */
  static async joinClassroom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = joinClassroomSchema.parse(req.body);
      const studentId = new mongoose.Types.ObjectId(req.user!.userId);

      const classroom = await Classroom.findOne({
        joinCode: data.joinCode.toUpperCase().trim(),
        isActive: true,
      }).populate('teacherId', 'name email');

      if (!classroom) {
        errorResponse(res, 'Classroom not found with the provided code', 404);
        return;
      }

      // Check if already a member
      const existing = await ClassroomMember.findOne({
        classroomId: classroom._id,
        studentId,
      });

      if (existing) {
        errorResponse(res, 'You have already joined this classroom', 409);
        return;
      }

      const membership = await ClassroomMember.create({
        classroomId: classroom._id,
        studentId,
        joinedAt: new Date(),
      });

      successResponse(
        res,
        {
          classroom,
          membership,
        },
        'Successfully joined classroom',
        201
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Failed to join classroom', 500);
    }
  }

  /**
   * Student gets all classrooms they are enrolled in
   */
  static async getStudentClassrooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = new mongoose.Types.ObjectId(req.user!.userId);
      const memberships = await ClassroomMember.find({ studentId }).populate({
        path: 'classroomId',
        populate: { path: 'teacherId', select: 'name email' },
      });

      const enrolledList = await Promise.all(
        memberships.map(async (m) => {
          const classroom = m.classroomId as any;
          if (!classroom) return null;

          // Check if active session exists
          const activeSession = await AttendanceSession.findOne({
            classroomId: classroom._id,
            status: 'ACTIVE',
          });

          // Check if student has already marked attendance for this active session
          let alreadyMarked = false;
          if (activeSession) {
            const record = await AttendanceRecord.findOne({
              sessionId: activeSession._id,
              studentId,
            });
            alreadyMarked = !!record;
          }

          // Total sessions and attended
          const totalSessions = await AttendanceSession.countDocuments({
            classroomId: classroom._id,
            status: { $in: ['ACTIVE', 'COMPLETED'] },
          });
          const attendedSessions = await AttendanceRecord.countDocuments({
            classroomId: classroom._id,
            studentId,
          });

          const percentage =
            totalSessions === 0
              ? 100
              : Math.round((attendedSessions / totalSessions) * 1000) / 10;

          return {
            id: classroom._id,
            subjectName: classroom.subjectName,
            subjectCode: classroom.subjectCode,
            section: classroom.section,
            semester: classroom.semester,
            academicYear: classroom.academicYear,
            teacherName: classroom.teacherId?.name || 'Instructor',
            joinCode: classroom.joinCode,
            joinedAt: m.joinedAt,
            hasActiveSession: !!activeSession,
            activeSessionId: activeSession?._id || null,
            alreadyMarkedForActiveSession: alreadyMarked,
            stats: {
              totalSessions,
              attendedSessions,
              missedSessions: Math.max(0, totalSessions - attendedSessions),
              percentage,
              isLowAttendance: totalSessions > 0 && percentage < 75,
            },
          };
        })
      );

      const filteredList = enrolledList.filter(Boolean);
      successResponse(res, filteredList);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch enrolled classrooms', 500);
    }
  }
}

