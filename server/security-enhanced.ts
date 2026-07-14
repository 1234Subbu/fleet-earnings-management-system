/**
 * Enhanced Security & Input Validation Module
 * Adds comprehensive security checks for all data operations
 */

import validator from 'validator';
import crypto from 'crypto';

// ===== ENHANCED INPUT VALIDATION =====

export const ValidationRules = {
  // User validations
  username: {
    min: 3,
    max: 50,
    pattern: /^[a-zA-Z0-9_-]{3,50}$/,
    message: 'Username: 3-50 alphanumeric, underscore, hyphen only',
  },
  
  password: {
    min: 8,
    max: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
    message: 'Password: min 8 chars, uppercase, lowercase, number, special char',
  },
  
  name: {
    min: 2,
    max: 100,
    pattern: /^[a-zA-Z\s'-]{2,100}$/,
    message: 'Name: 2-100 chars, letters, spaces, hyphens, apostrophes',
  },
  
  vehicleNumber: {
    pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$|^[A-Z0-9]{10}$/,
    message: 'Vehicle: Indian format (XX-XX-XX-XXXX) or 10-char alphanumeric',
  },
  
  phoneNumber: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Phone: Indian format (10 digits starting with 6-9)',
  },
};

/**
 * Comprehensive input validator with all checks
 */
export class InputValidator {
  static validateUsername(username: string): { valid: boolean; error?: string } {
    const rule = ValidationRules.username;
    
    if (!username) return { valid: false, error: 'Username required' };
    if (username.length < rule.min) return { valid: false, error: `Username min ${rule.min} chars` };
    if (username.length > rule.max) return { valid: false, error: `Username max ${rule.max} chars` };
    if (!rule.pattern.test(username)) return { valid: false, error: rule.message };
    
    return { valid: true };
  }

  static validatePassword(password: string): { valid: boolean; error?: string } {
    const rule = ValidationRules.password;
    
    if (!password) return { valid: false, error: 'Password required' };
    if (password.length < rule.min) return { valid: false, error: `Password min ${rule.min} chars` };
    if (password.length > rule.max) return { valid: false, error: `Password max ${rule.max} chars` };
    if (!rule.pattern.test(password)) return { valid: false, error: rule.message };
    
    return { valid: true };
  }

  static validateName(name: string): { valid: boolean; error?: string } {
    const rule = ValidationRules.name;
    
    if (!name) return { valid: false, error: 'Name required' };
    if (name.length < rule.min) return { valid: false, error: `Name min ${rule.min} chars` };
    if (name.length > rule.max) return { valid: false, error: `Name max ${rule.max} chars` };
    if (!rule.pattern.test(name)) return { valid: false, error: rule.message };
    
    return { valid: true };
  }

  static validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) return { valid: false, error: 'Email required' };
    if (!validator.isEmail(email)) return { valid: false, error: 'Invalid email format' };
    if (email.length > 255) return { valid: false, error: 'Email too long' };
    
    return { valid: true };
  }

  static validateVehicleNumber(vehicleNumber: string): { valid: boolean; error?: string } {
    const rule = ValidationRules.vehicleNumber;
    
    if (!vehicleNumber) return { valid: false, error: 'Vehicle number required' };
    if (!rule.pattern.test(vehicleNumber.toUpperCase())) {
      return { valid: false, error: rule.message };
    }
    
    return { valid: true };
  }

  static validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    const rule = ValidationRules.phoneNumber;
    
    if (!phone) return { valid: false, error: 'Phone number required' };
    if (!rule.pattern.test(phone)) return { valid: false, error: rule.message };
    
    return { valid: true };
  }

  static validateNumericField(
    value: any,
    fieldName: string,
    min: number = 0,
    max: number = 999999999
  ): { valid: boolean; error?: string } {
    const num = parseFloat(value);
    
    if (isNaN(num)) return { valid: false, error: `${fieldName} must be a number` };
    if (num < min) return { valid: false, error: `${fieldName} minimum ${min}` };
    if (num > max) return { valid: false, error: `${fieldName} maximum ${max}` };
    
    return { valid: true };
  }

  static validateDate(date: string, fieldName: string = 'Date'): { valid: boolean; error?: string } {
    if (!date) return { valid: false, error: `${fieldName} required` };
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: `${fieldName} invalid format (YYYY-MM-DD)` };
    }
    
    return { valid: true };
  }

  static validateFileUpload(
    fileSize: number,
    fileType: string,
    maxSizeMB: number = 5,
    allowedTypes: string[] = ['jpg', 'jpeg', 'png', 'pdf']
  ): { valid: boolean; error?: string } {
    const maxBytes = maxSizeMB * 1024 * 1024;
    
    if (fileSize > maxBytes) {
      return { valid: false, error: `File exceeds ${maxSizeMB}MB limit` };
    }
    
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return { valid: false, error: `File type .${fileType} not allowed` };
    }
    
    return { valid: true };
  }
}

// ===== ACCOUNT SECURITY =====

export interface AccountSecurityState {
  failedLoginAttempts: number;
  lastFailedLoginTime: Date | null;
  isLocked: boolean;
  lockUntil: Date | null;
}

export class AccountSecurityManager {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCK_TIME_MINUTES = 15;
  private static readonly ATTEMPT_RESET_MINUTES = 15;

  /**
   * Check if account is locked after failed attempts
   */
  static isAccountLocked(state: AccountSecurityState): boolean {
    if (!state.isLocked) return false;
    
    // Unlock if lock time has passed
    if (state.lockUntil && new Date() > state.lockUntil) {
      return false;
    }
    
    return true;
  }

  /**
   * Record failed login attempt
   */
  static recordFailedAttempt(state: AccountSecurityState): AccountSecurityState {
    const now = new Date();
    const lastAttemptMinutesAgo = state.lastFailedLoginTime
      ? (now.getTime() - state.lastFailedLoginTime.getTime()) / (1000 * 60)
      : null;

    // Reset attempts if time has passed
    if (lastAttemptMinutesAgo && lastAttemptMinutesAgo > this.ATTEMPT_RESET_MINUTES) {
      return {
        failedLoginAttempts: 1,
        lastFailedLoginTime: now,
        isLocked: false,
        lockUntil: null,
      };
    }

    const newAttempts = state.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= this.MAX_LOGIN_ATTEMPTS;

    return {
      failedLoginAttempts: newAttempts,
      lastFailedLoginTime: now,
      isLocked: shouldLock,
      lockUntil: shouldLock ? new Date(now.getTime() + this.LOCK_TIME_MINUTES * 60000) : null,
    };
  }

  /**
   * Reset failed attempts on successful login
   */
  static recordSuccessfulLogin(): AccountSecurityState {
    return {
      failedLoginAttempts: 0,
      lastFailedLoginTime: null,
      isLocked: false,
      lockUntil: null,
    };
  }
}

// ===== DATA ENCRYPTION =====

export class DataEncryption {
  /**
   * Encrypt sensitive fields (like bank account numbers)
   * Use: ENCRYPTION_KEY environment variable (32 chars)
   */
  static encrypt(plaintext: string, encryptionKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive fields
   */
  static decrypt(encryptedData: string, encryptionKey: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      iv
    );

    let decrypted = decipher.update(parts[1], 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }

  /**
   * Hash sensitive data (one-way, for storage)
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// ===== SECURE LOGGING =====

export class SecureLogger {
  /**
   * Log action without exposing sensitive data
   */
  static logSecurely(
    action: string,
    userId: string,
    data: any,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key']
  ): string {
    const safeData = { ...data };

    // Remove sensitive fields from log
    sensitiveFields.forEach((field) => {
      if (safeData[field]) {
        safeData[field] = '***REDACTED***';
      }
    });

    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      data: safeData,
    };

    console.log(JSON.stringify(logEntry));
    return JSON.stringify(logEntry);
  }

  /**
   * Log security events separately
   */
  static logSecurityEvent(
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    userId: string | null,
    details: string,
    ipAddress: string
  ): void {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      userId,
      details,
      ipAddress,
    };

    console.error(`[SECURITY] ${JSON.stringify(event)}`);
  }
}

// ===== API REQUEST VALIDATION =====

export class APIRequestValidator {
  /**
   * Validate all required fields in request
   */
  static validateRequired(data: any, requiredFields: string[]): { valid: boolean; missing?: string[] } {
    const missing = requiredFields.filter((field) => !data[field]);

    if (missing.length > 0) {
      return { valid: false, missing };
    }

    return { valid: true };
  }

  /**
   * Sanitize all string inputs
   */
  static sanitizeInputs(data: any): any {
    const sanitized = { ...data };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = validator.trim(sanitized[key]).slice(0, 1000);
      }
    }

    return sanitized;
  }

  /**
   * Validate request signatures (for APIs)
   */
  static validateSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// ===== CSRF PROTECTION =====

export class CSRFProtection {
  /**
   * Generate CSRF token
   */
  static generateToken(sessionId: string): string {
    return crypto
      .createHmac('sha256', sessionId)
      .update(Date.now().toString())
      .digest('hex');
  }

  /**
   * Verify CSRF token
   */
  static verifyToken(token: string, sessionId: string): boolean {
    const expectedToken = crypto
      .createHmac('sha256', sessionId)
      .update(Date.now().toString())
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  }
}

// ===== RATE LIMITING HELPER =====

export class RateLimitManager {
  private static readonly requestMap = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request exceeds rate limit
   */
  static checkLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requestMap.get(identifier);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requestMap.set(identifier, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
  }

  /**
   * Reset rate limit for user
   */
  static resetLimit(identifier: string): void {
    this.requestMap.delete(identifier);
  }
}
