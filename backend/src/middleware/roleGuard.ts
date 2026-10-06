import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/index.js';
import { errorResponse } from '../utils/apiResponse.js';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Unauthorized. Please log in first.', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(
        res,
        `Access denied. Requires one of [${roles.join(', ')}] role.`,
        403
      );
      return;
    }

    next();
  };
}

