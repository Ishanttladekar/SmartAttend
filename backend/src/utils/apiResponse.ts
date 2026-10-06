import { Response } from 'express';

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message = 'An error occurred',
  statusCode = 400,
  errors: any = null
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

