import { Request, Response, NextFunction } from 'express';
import { isDatabaseConnected } from '../database';

export function checkDatabaseConnection(req: Request, res: Response, next: NextFunction) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database is currently unavailable. Please try again later.',
      status: 'database_unavailable'
    });
  }
  next();
}