/**
 * Security utilities for the HeyPeter Academy LMS
 * Provides functions for input sanitization, validation, and security hardening
 */

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param unsafe - The unsafe string to escape
 * @returns Escaped string safe for HTML insertion
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe || '');
  }
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitizes user input for safe database operations
 * @param input - The input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validates and sanitizes column names for database queries
 * @param column - Column name to validate
 * @param allowedColumns - Array of allowed column names
 * @returns Validated column name or null if invalid
 */
export function validateColumnName(column: string, allowedColumns: string[]): string | null {
  if (typeof column !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(column);
  
  // Check if column is in allowed list
  if (!allowedColumns.includes(sanitized)) {
    return null;
  }
  
  // Additional validation: only alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validates database operators
 * @param operator - The operator to validate
 * @returns True if operator is valid
 */
export function validateOperator(operator: string): boolean {
  const allowedOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in'];
  return allowedOperators.includes(operator);
}

/**
 * Sanitizes filename for safe file operations
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'untitled';
  }
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .substring(0, 255);
}

/**
 * Validates file type against allowed types
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  if (!file || !file.type) {
    return false;
  }
  
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      const baseType = type.replace('*', '');
      return file.type.startsWith(baseType);
    }
    return file.type === type;
  });
}

/**
 * Validates file size
 * @param file - File to validate
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if file size is within limits
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file && file.size <= maxSize;
}

/**
 * Generates a secure random token
 * @param length - Length of the token
 * @returns Random token string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomArray[i] % chars.length);
  }
  
  return result;
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if email format is valid
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with validation result and requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;
  
  if (typeof password !== 'string') {
    return { isValid: false, errors: ['Password must be a string'], score: 0 };
  }
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score
  };
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}
  
  /**
   * Check if request is allowed
   * @param key - Unique identifier for the client (IP, user ID, etc.)
   * @returns True if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a key
   * @param key - Unique identifier for the client
   * @returns Number of remaining requests
   */
  getRemainingRequests(key: string): number {
    const record = this.requests.get(key);
    if (!record || Date.now() > record.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }
  
  /**
   * Clear requests for a key
   * @param key - Unique identifier for the client
   */
  clear(key: string): void {
    this.requests.delete(key);
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Content Security Policy utilities
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'", 'https://api.supabase.co'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

/**
 * Generate CSP header value
 * @param directives - Custom CSP directives
 * @returns CSP header value
 */
export function generateCSP(directives: Partial<typeof CSP_DIRECTIVES> = {}): string {
  const merged = { ...CSP_DIRECTIVES, ...directives };
  
  return Object.entries(merged)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Security headers for Next.js
 */
export const SECURITY_HEADERS = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];