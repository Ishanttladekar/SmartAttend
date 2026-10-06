import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Unhandled Error]', err);

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    errorResponse(res, `Duplicate entry: ${field} already exists.`, 409);
    return;
  }

  if (err.name === 'ValidationError') {
    errorResponse(res, err.message, 400);
    return;
  }

  errorResponse(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    500
  );
}

