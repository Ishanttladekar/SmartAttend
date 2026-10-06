import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/apiResponse.js';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Authentication required. No token provided.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    errorResponse(res, 'Invalid or expired authentication token', 401);
  }
}

