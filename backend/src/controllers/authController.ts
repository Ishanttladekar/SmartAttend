import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { TeacherProfile } from '../models/TeacherProfile.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { signToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../types/index.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['teacher', 'student']),
  // Teacher specific
  employeeId: z.string().optional(),
  // Student specific
  rollNumber: z.string().optional(),
  department: z.string().min(2, 'Department is required'),
  semester: z.number().int().min(1).max(12).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);

      // Check existing email
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        errorResponse(res, 'User with this email already exists', 409);
        return;
      }

      // Role-specific validation
      if (data.role === 'teacher') {
        if (!data.employeeId) {
          errorResponse(res, 'Employee ID is required for teachers', 422);
          return;
        }
      } else {
        if (!data.rollNumber) {
          errorResponse(res, 'Roll number is required for students', 422);
          return;
        }
        if (!data.semester) {
          errorResponse(res, 'Semester is required for students', 422);
          return;
        }

        const existingRoll = await StudentProfile.findOne({
          rollNumber: data.rollNumber.toUpperCase().trim(),
        });
        if (existingRoll) {
          errorResponse(res, 'Roll number is already registered', 409);
          return;
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await User.create({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
      });

      if (data.role === 'teacher') {
        await TeacherProfile.create({
          userId: user._id,
          employeeId: data.employeeId!.trim(),
          department: data.department.trim(),
        });
      } else {
        await StudentProfile.create({
          userId: user._id,
          rollNumber: data.rollNumber!.toUpperCase().trim(),
          department: data.department.trim(),
          semester: data.semester!,
          faceDescriptor: null,
          webAuthnCredentials: [],
        });
      }

      const token = signToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });

      successResponse(
        res,
        {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        'Registration successful',
        201
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Registration failed', 500);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);

      const user = await User.findOne({ email: data.email.toLowerCase().trim() });
      if (!user) {
        errorResponse(res, 'Invalid email or password', 401);
        return;
      }

      const isMatch = await bcrypt.compare(data.password, user.passwordHash);
      if (!isMatch) {
        errorResponse(res, 'Invalid email or password', 401);
        return;
      }

      let profileData: any = null;
      if (user.role === 'teacher') {
        profileData = await TeacherProfile.findOne({ userId: user._id });
      } else {
        profileData = await StudentProfile.findOne({ userId: user._id });
      }

      const token = signToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });

      successResponse(res, {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: profileData
            ? {
                ...profileData.toObject(),
                faceDescriptor: undefined, // Do not expose raw descriptor array
                isFaceEnrolled: !!profileData.faceDescriptor,
                isPasskeyEnrolled: (profileData.webAuthnCredentials || []).length > 0,
              }
            : null,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errorResponse(res, 'Validation error', 422, error.errors);
        return;
      }
      errorResponse(res, error.message || 'Login failed', 500);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user!.userId).select('-passwordHash');
      if (!user) {
        errorResponse(res, 'User not found', 404);
        return;
      }

      let profileData: any = null;
      if (user.role === 'teacher') {
        profileData = await TeacherProfile.findOne({ userId: user._id });
      } else {
        profileData = await StudentProfile.findOne({ userId: user._id });
      }

      successResponse(res, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: profileData
            ? {
                ...profileData.toObject(),
                faceDescriptor: undefined,
                isFaceEnrolled: !!profileData.faceDescriptor,
                isPasskeyEnrolled: (profileData.webAuthnCredentials || []).length > 0,
              }
            : null,
        },
      });
    } catch (error: any) {
      errorResponse(res, error.message || 'Failed to fetch user', 500);
    }
  }
}

