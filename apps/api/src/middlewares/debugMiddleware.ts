import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

// Create debug logger instance
const debugLogger = pino({
  name: 'tatame-debug',
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname'
    }
  } : undefined
});

export interface DebugRequest extends Request {
  debugId?: string;
  startTime?: number;
}

// Generate unique request ID for tracing
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sanitize request body for logging (remove sensitive data)
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = [
    'password', 'applicationPassword', 'token', 'secret', 'key', 
    'authorization', 'cookie', 'session'
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Sanitize response data
function sanitizeResponseData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  // Remove sensitive fields from response
  if (sanitized.data && typeof sanitized.data === 'object') {
    const { applicationPassword, ...safeData } = sanitized.data;
    sanitized.data = safeData;
  }
  
  return sanitized;
}

export const debugMiddleware = (req: DebugRequest, res: Response, next: NextFunction): void => {
  // Only enable for WordPress-related routes or when debug is enabled
  const isWordPressRoute = req.path.includes('wordpress') || req.path.includes('sites');
  const isDebugEnabled = process.env.NODE_ENV === 'development' || req.headers['x-debug'] === 'true';
  
  if (!isWordPressRoute && !isDebugEnabled) {
    return next();
  }

  req.debugId = generateRequestId();
  req.startTime = Date.now();

  // Extract user info for logging
  const userId = (req as any).user?.userId;
  const userEmail = (req as any).user?.email;

  // Log incoming request
  debugLogger.info({
    requestId: req.debugId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'origin': req.headers.origin
    },
    userId,
    userEmail,
    timestamp: new Date().toISOString()
  }, `📥 [${req.method}] ${req.originalUrl}`);

  // Store original res.json to intercept response
  const originalJson = res.json;
  const originalStatus = res.status;
  const originalSend = res.send;

  let responseData: any;
  let statusCode = 200;

  // Override res.status to capture status code
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override res.json to capture response data
  res.json = function(data: any) {
    responseData = data;
    
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    // Log response
    debugLogger[level]({
      requestId: req.debugId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      responseData: sanitizeResponseData(data),
      duration,
      userId,
      userEmail,
      timestamp: new Date().toISOString()
    }, `📤 [${req.method}] ${req.originalUrl} - ${statusCode} (${duration}ms)`);

    // Call original json method
    return originalJson.call(this, data);
  };

  // Override res.send to capture non-JSON responses
  res.send = function(data: any) {
    if (!responseData) {
      responseData = data;
      
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
      
      debugLogger[level]({
        requestId: req.debugId,
        method: req.method,
        url: req.originalUrl,
        statusCode,
        responseData: typeof data === 'string' ? data.substring(0, 200) : data,
        duration,
        userId,
        userEmail,
        timestamp: new Date().toISOString()
      }, `📤 [${req.method}] ${req.originalUrl} - ${statusCode} (${duration}ms)`);
    }

    return originalSend.call(this, data);
  };

  // Handle errors
  res.on('error', (error) => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    debugLogger.error({
      requestId: req.debugId,
      method: req.method,
      url: req.originalUrl,
      error: {
        message: error.message,
        stack: error.stack
      },
      duration,
      userId,
      userEmail,
      timestamp: new Date().toISOString()
    }, `💥 [${req.method}] ${req.originalUrl} - ERROR (${duration}ms)`);
  });

  next();
};

// Export debugLogger (already declared above)

// Database operation logging
export const logDatabaseOperation = (
  requestId: string | undefined,
  model: string,
  operation: string,
  query: any,
  result: any,
  duration?: number
): void => {
  debugLogger.debug({
    requestId,
    category: 'DATABASE',
    model,
    operation,
    query: sanitizeRequestBody(query),
    result: Array.isArray(result) ? 
      { count: result.length, items: result.slice(0, 3) } : 
      result,
    duration,
    timestamp: new Date().toISOString()
  }, `🗄️  [DB] ${model}.${operation} ${duration ? `(${duration}ms)` : ''}`);
};

// WordPress connection logging
export const logWordPressConnection = (
  requestId: string | undefined,
  url: string,
  status: 'testing' | 'success' | 'failed',
  details?: any,
  duration?: number
): void => {
  const level = status === 'success' ? 'info' : status === 'failed' ? 'error' : 'debug';
  
  debugLogger[level]({
    requestId,
    category: 'WP_CONNECTION',
    url,
    status,
    details: sanitizeRequestBody(details),
    duration,
    timestamp: new Date().toISOString()
  }, `🌐 [WP] ${url} - ${status.toUpperCase()} ${duration ? `(${duration}ms)` : ''}`);
};

// Duplicate check logging
export const logDuplicateCheck = (
  requestId: string | undefined,
  url: string,
  userId: string,
  results: any
): void => {
  debugLogger.info({
    requestId,
    category: 'DUPLICATE_CHECK',
    url,
    userId,
    results: {
      found: results ? (Array.isArray(results) ? results.length : 1) : 0,
      data: Array.isArray(results) ? results.map((r: any) => ({
        id: r._id,
        url: r.url,
        domain: r.domain,
        status: r.status,
        templateId: r.templateId
      })) : results ? {
        id: results._id,
        url: results.url,
        domain: results.domain,
        status: results.status,
        templateId: results.templateId
      } : null
    },
    timestamp: new Date().toISOString()
  }, `🔍 [DUPLICATE] Checking ${url} for user ${userId}`);
};

// Installation tracking
export const logInstallationStep = (
  requestId: string | undefined,
  installationId: string,
  step: string,
  status: 'started' | 'completed' | 'failed',
  details?: any
): void => {
  const level = status === 'failed' ? 'error' : 'info';
  
  debugLogger[level]({
    requestId,
    category: 'INSTALLATION',
    installationId,
    step,
    status,
    details,
    timestamp: new Date().toISOString()
  }, `⚙️ [INSTALL] ${installationId} - ${step}: ${status.toUpperCase()}`);
};

export { debugLogger };