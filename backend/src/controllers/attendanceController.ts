import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../types/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { calculateHaversineDistanceMeters, isValidCoordinate } from '../utils/geo.js';
import { FaceService } from '../services/faceService.js';
import { WebAuthnService } from '../services/webAuthnService.js';
import { emitAttendanceMarked } from '../socket/index.js';
import { config } from '../config/index.js';

export const markAttendanceSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  sessionNonce: z.string().min(1, 'Session nonce is required for anti-replay verification'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(500),
  faceDescriptor: z.array(z.number()).length(128).optional(),
  webAuthnResponse: z.any().optional(),
});

export class AttendanceController {
  /**
   * Mark attendance with location geofence (25m) and biometric identity verification
   */
  static async markAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = markAttendanceSchema.parse(req.body);
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);

      // 1. Verify student profile
      const studentProfile = await StudentProfile.findOne({ userId: studentUserId });
      if (!studentProfile) {
        errorResponse(res, 'Student profile not found. Please complete profile setup.', 404);
        return;
      }

      // 2. Fetch and validate session
      const session = await AttendanceSession.findById(data.sessionId);
      if (!session) {
        errorResponse(res, 'Attendance session not found.', 404);
        return;
      }

      if (session.status !== 'ACTIVE') {
        errorResponse(res, 'This attendance session has already ended or is not active.', 400);
        return;
      }

      // 3. Verify classroom membership
      const isMember = await ClassroomMember.findOne({
        classroomId: session.classroomId,
        studentId: studentUserId,
      });

      if (!isMember) {
        errorResponse(res, 'You are not enrolled in this classroom.', 403);
        return;
      }

      // 4. Check for duplicate attendance submission
      const existingRecord = await AttendanceRecord.findOne({
        sessionId: session._id,
        studentId: studentUserId,
      });

      if (existingRecord) {
        errorResponse(res, 'You have already marked attendance for this session.', 409);
        return;
      }

      // 5. Anti-Replay: Nonce check
      if (session.sessionNonce !== data.sessionNonce) {
        errorResponse(res, 'Security validation failed: Invalid or expired session nonce. Please refresh.', 400);
        return;
      }

      // 6. GPS Coordinate & Accuracy Validation
      if (!isValidCoordinate(data.latitude, data.longitude)) {
        errorResponse(res, 'Invalid GPS coordinates submitted.', 400);
        return;
      }

      if (data.accuracy > config.gpsMaxAccuracyThreshold) {
        errorResponse(
          res,
          `Location accuracy is too low (±${data.accuracy.toFixed(1)}m). Please enable high-accuracy GPS or move closer to a window, and try again.`,
          422
        );
        return;
      }

      // Calculate distance using Haversine formula
      const distanceMeters = calculateHaversineDistanceMeters(
        data.latitude,
        data.longitude,
        session.authorizedLocation.latitude,
        session.authorizedLocation.longitude
      );

      const maxAllowedRadius = session.allowedRadiusMeters || config.defaultAllowedRadiusMeters;

      if (distanceMeters > maxAllowedRadius) {
        errorResponse(
          res,
          `You are outside the ${maxAllowedRadius}-meter attendance area (${distanceMeters.toFixed(1)}m away).`,
          403,
          {
            distanceMeters,
            allowedRadiusMeters: maxAllowedRadius,
          }
        );
        return;
      }

      // 7. Anti-Proxy Biometric Verification
      let faceVerified = false;
      let passkeyVerified = false;

      // A) Face verification
      if (data.faceDescriptor) {
        if (!studentProfile.faceDescriptor || studentProfile.faceDescriptor.length !== 128) {
          errorResponse(
            res,
            'No facial identity registered. Please enroll your face in profile settings first.',
            400
          );
          return;
        }

        const match = FaceService.matchDescriptor(
          data.faceDescriptor,
          studentProfile.faceDescriptor
        );

        if (!match.isMatch) {
          errorResponse(
            res,
            `Facial identity verification failed: Face does not match registered profile (distance: ${match.distance}, confidence: ${match.confidencePercent}%).`,
            401,
            { confidencePercent: match.confidencePercent }
          );
          return;
        }

        faceVerified = true;
      }

      // B) Passkey / WebAuthn verification
      if (data.webAuthnResponse && studentProfile.currentWebAuthnChallenge) {
        const matchingCredential = studentProfile.webAuthnCredentials.find(
          (c) => c.credentialId === data.webAuthnResponse.id
        );

        if (matchingCredential) {
          try {
            const verification = await WebAuthnService.verifyAuthentication(
              data.webAuthnResponse,
              studentProfile.currentWebAuthnChallenge,
              matchingCredential
            );

            if (verification.verified) {
              matchingCredential.counter = verification.authenticationInfo.newCounter;
              studentProfile.currentWebAuthnChallenge = undefined;
              await studentProfile.save();
              passkeyVerified = true;
            }
          } catch (passkeyErr: any) {
            console.warn('[WebAuthn] Verification failed:', passkeyErr.message);
          }
        }
      }

      // Require at least one verified biometric method
      if (!faceVerified && !passkeyVerified) {
        errorResponse(
          res,
          'Biometric verification failed. You must verify using live facial recognition or device biometric passkey.',
          400
        );
        return;
      }

      // 8. Create Attendance Record
      const record = await AttendanceRecord.create({
        sessionId: session._id,
        classroomId: session.classroomId,
        studentId: studentUserId,
        timestamp: new Date(),
        studentLocation: {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          distanceMeters,
        },
        verificationMethods: {
          locationVerified: true,
          faceVerified,
          passkeyVerified,
        },
        status: 'PRESENT',
      });

      // 9. Notify teacher dashboard in real-time
      const studentUser = await User.findById(studentUserId).select('name email');
      emitAttendanceMarked(session._id.toString(), {
        recordId: record._id,
        studentId: studentUserId,
        name: studentUser?.name || 'Student',
        rollNumber: studentProfile.rollNumber,
        distanceMeters,
        timestamp: record.timestamp,
        verificationMethods: record.verificationMethods,
      });

      successResponse(
        res,
        {
          recordId: record._id,
          distanceMeters,
          timestamp: record.timestamp,
          verificationMethods: record.verificationMethods,
        },
        `You are ${distanceMeters.toFixed(1)}m away. Location and biometric identity verified. Attendance marked successfully!`
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      if (error.code === 11000) {
        errorResponse(res, 'You have already marked attendance for this session.', 409);
        return;
      }
      errorResponse(res, error.message || 'Failed to mark attendance', 500);
    }
  }

  /**
   * Student views their attendance history
   */
  static async getStudentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = new mongoose.Types.ObjectId(req.user!.userId);
      const records = await AttendanceRecord.find({ studentId })
        .populate('classroomId', 'subjectName subjectCode section semester')
        .populate('sessionId', 'startTime endTime sessionCode')
        .sort({ timestamp: -1 });

      const history = records.map((r) => {
        const classroom = r.classroomId as any;
        const session = r.sessionId as any;
        return {
          id: r._id,
          subjectName: classroom?.subjectName || 'Unknown Subject',
          subjectCode: classroom?.subjectCode || 'N/A',
          section: classroom?.section || 'A',
          timestamp: r.timestamp,
          sessionCode: session?.sessionCode || 'N/A',
          distanceMeters: r.studentLocation.distanceMeters,
          verificationMethods: r.verificationMethods,
          status: r.status,
        };
      });

      successResponse(res, history);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch attendance history', 500);
    }
  }
}

