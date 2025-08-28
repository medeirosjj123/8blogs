import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates need for try-catch blocks in every controller
 * 
 * Usage:
 * export const getUsers = asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * });
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error wrapper for consistent error responses
 */
export class ValidationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * Authorization error wrapper
 */
export class AuthError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Unauthorized', statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Resource not found error wrapper
 */
export class NotFoundError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Resource not found', statusCode: number = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
  }
}

/**
 * Rate limit error wrapper
 */
export class RateLimitError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Too many requests', statusCode: number = 429) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
  }
}