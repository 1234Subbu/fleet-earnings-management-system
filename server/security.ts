import validator from 'validator';

/**
 * Security Utilities for Fleet Earnings Management System
 */

// Input validation
export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

export const validateUsername = (username: string): boolean => {
  // Username: 3-50 chars, alphanumeric + underscore
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
};

export const validatePassword = (password: string): boolean => {
  // Password: minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return validator.trim(input).slice(0, 255);
};

export const validateVehicleNumber = (vehicleNumber: string): boolean => {
  // Indian vehicle number format: XX-XX-XX-XXXX or XXXXXXXXXX
  return /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$|^[A-Z0-9]{10}$/.test(vehicleNumber.toUpperCase());
};

export const validatePhoneNumber = (phone: string): boolean => {
  return validator.isMobilePhone(phone, 'en-IN');
};

export const validateNumericInput = (value: string, min: number = 0, max: number = 999999999): boolean => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Rate limiting keys
export const getRateLimitKey = (req: any): string => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.APP_URL,
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Security headers
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Error handling
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: any, res: any, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Audit logging
export interface AuditLogEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export const createAuditLog = (
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  req: any,
  oldValues?: any,
  newValues?: any
): AuditLogEntry => {
  return {
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    timestamp: new Date(),
  };
};
