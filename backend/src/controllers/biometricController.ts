import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { StudentProfile } from '../models/StudentProfile.js';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../types/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { FaceService } from '../services/faceService.js';
import { WebAuthnService } from '../services/webAuthnService.js';

export const enrollFaceSchema = z.object({
  faceDescriptor: z.array(z.number()).length(128, 'Face descriptor must be a 128-float vector'),
});

export class BiometricController {
  /**
   * Enrolls student facial embedding vector (128 floats).
   * PRIVACY GUARANTEE: Does NOT store raw photos.
   */
  static async enrollFace(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = enrollFaceSchema.parse(req.body);
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);

      if (!FaceService.isValidDescriptor(data.faceDescriptor)) {
        errorResponse(res, 'Invalid face descriptor values detected', 422);
        return;
      }

      const profile = await StudentProfile.findOneAndUpdate(
        { userId: studentUserId },
        {
          faceDescriptor: data.faceDescriptor,
          faceEnrolledAt: new Date(),
        },
        { new: true }
      );

      if (!profile) {
        errorResponse(res, 'Student profile not found', 404);
        return;
      }

      successResponse(
        res,
        {
          isFaceEnrolled: true,
          enrolledAt: profile.faceEnrolledAt,
        },
        'Facial biometric template successfully enrolled.'
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Face enrollment failed', 500);
    }
  }

  /**
   * Deletes registered face biometric template (Right to erasure / privacy compliance)
   */
  static async deleteFace(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);
      await StudentProfile.findOneAndUpdate(
        { userId: studentUserId },
        {
          faceDescriptor: null,
          faceEnrolledAt: null,
        }
      );

      successResponse(res, null, 'Facial biometric template deleted.');
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to delete facial data', 500);
    }
  }

  /**
   * WebAuthn: Generates registration options for registering a platform passkey (fingerprint/Windows Hello/Touch ID)
   */
  static async getPasskeyRegistrationOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);
      const profile = await StudentProfile.findOne({ userId: studentUserId });
      const user = await User.findById(studentUserId);

      if (!profile || !user) {
        errorResponse(res, 'Student profile not found', 404);
        return;
      }

      const options = await WebAuthnService.getRegistrationOptions(
        user._id.toString(),
        user.email,
        profile.webAuthnCredentials
      );

      profile.currentWebAuthnChallenge = options.challenge;
      await profile.save();

      res.json(options);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to generate passkey options', 500);
    }
  }

  /**
   * WebAuthn: Verifies registration response and stores public key credential
   */
  static async verifyPasskeyRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);
      const profile = await StudentProfile.findOne({ userId: studentUserId });

      if (!profile || !profile.currentWebAuthnChallenge) {
        errorResponse(res, 'No active passkey registration challenge found', 400);
        return;
      }

      const verification = await WebAuthnService.verifyRegistration(
        req.body,
        profile.currentWebAuthnChallenge
      );

      if (!verification.verified || !verification.registrationInfo) {
        errorResponse(res, 'Passkey verification failed', 400);
        return;
      }

      const { credential } = verification.registrationInfo;

      profile.webAuthnCredentials.push({
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: req.body.response?.transports || [],
        deviceType: verification.registrationInfo.credentialDeviceType || 'platform',
        createdAt: new Date(),
      });

      profile.currentWebAuthnChallenge = undefined;
      await profile.save();

      successResponse(
        res,
        {
          credentialId: credential.id,
          totalCredentials: profile.webAuthnCredentials.length,
        },
        'Platform biometric passkey registered successfully.'
      );
    } catch (error: any) {
      errorResponse(res, error.message || 'Passkey enrollment failed', 500);
    }
  }

  /**
   * WebAuthn: Generates authentication options for student device verification
   */
  static async getPasskeyAuthOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);
      const profile = await StudentProfile.findOne({ userId: studentUserId });

      if (!profile || profile.webAuthnCredentials.length === 0) {
        errorResponse(res, 'No registered passkeys found for this student', 400);
        return;
      }

      const options = await WebAuthnService.getAuthenticationOptions(profile.webAuthnCredentials);
      profile.currentWebAuthnChallenge = options.challenge;
      await profile.save();

      res.json(options);
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to generate auth options', 500);
    }
  }

  /**
   * Get student's current biometric setup status
   */
  static async getBiometricStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentUserId = new mongoose.Types.ObjectId(req.user!.userId);
      const profile = await StudentProfile.findOne({ userId: studentUserId });

      if (!profile) {
        errorResponse(res, 'Profile not found', 404);
        return;
      }

      successResponse(res, {
        isFaceEnrolled: !!profile.faceDescriptor && profile.faceDescriptor.length === 128,
        faceEnrolledAt: profile.faceEnrolledAt,
        passkeyCount: (profile.webAuthnCredentials || []).length,
        isPasskeyEnrolled: (profile.webAuthnCredentials || []).length > 0,
      });
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch biometric status', 500);
    }
  }
}

