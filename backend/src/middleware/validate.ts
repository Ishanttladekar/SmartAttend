import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/apiResponse.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        errorResponse(res, 'Validation failed', 422, issues);
        return;
      }
      errorResponse(res, 'Invalid request body', 400);
    }
  };
}

