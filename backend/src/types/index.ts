import { Request } from 'express';

export type UserRole = 'teacher' | 'student';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

