/**
 * User-Friendly Error Messages
 * Provides contextual, helpful error messages for different scenarios
 */

import { AppError, ErrorCode, isAppError } from './app-error';

export interface ErrorMessageConfig {
  title: string;
  message: string;
  action?: string;
  icon?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Error message configurations for different contexts
 */
const ERROR_MESSAGES: Record<ErrorCode, ErrorMessageConfig> = {
  [ErrorCode.UNAUTHORIZED]: {
    title: 'Sign In Required',
    message: 'Please sign in to continue accessing this content.',
    action: 'Sign In',
    icon: '🔐',
    severity: 'warning'
  },

  [ErrorCode.INVALID_CREDENTIALS]: {
    title: 'Invalid Credentials',
    message: 'The email address or password you entered is incorrect. Please try again.',
    action: 'Try Again',
    icon: '❌',
    severity: 'error'
  },

  [ErrorCode.SESSION_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired for security reasons. Please sign in again.',
    action: 'Sign In',
    icon: '⏰',
    severity: 'warning'
  },

  [ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this resource. Contact your administrator if you need access.',
    action: 'Go Back',
    icon: '🚫',
    severity: 'error'
  },

  [ErrorCode.VALIDATION_ERROR]: {
    title: 'Input Error',
    message: 'Please review and correct the highlighted fields before continuing.',
    action: 'Review',
    icon: '⚠️',
    severity: 'warning'
  },

  [ErrorCode.INVALID_INPUT]: {
    title: 'Invalid Input',
    message: 'The information you provided is not valid. Please check your entries and try again.',
    action: 'Correct',
    icon: '📝',
    severity: 'warning'
  },

  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    title: 'Missing Information',
    message: 'Some required fields are missing. Please fill in all required information.',
    action: 'Complete',
    icon: '📋',
    severity: 'warning'
  },

  [ErrorCode.INVALID_FORMAT]: {
    title: 'Format Error',
    message: 'The format of your input is incorrect. Please follow the specified format.',
    action: 'Fix Format',
    icon: '🔧',
    severity: 'warning'
  },

  [ErrorCode.API_ERROR]: {
    title: 'Request Failed',
    message: 'We encountered an issue processing your request. Please try again in a moment.',
    action: 'Retry',
    icon: '🔄',
    severity: 'error'
  },

  [ErrorCode.NETWORK_ERROR]: {
    title: 'Connection Issue',
    message: 'Unable to connect to our servers. Please check your internet connection and try again.',
    action: 'Retry',
    icon: '🌐',
    severity: 'error'
  },

  [ErrorCode.TIMEOUT_ERROR]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete. This might be due to a slow connection.',
    action: 'Try Again',
    icon: '⏱️',
    severity: 'warning'
  },

  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests in a short time. Please wait a moment before trying again.',
    action: 'Wait',
    icon: '🚦',
    severity: 'warning'
  },

  [ErrorCode.DATABASE_ERROR]: {
    title: 'Data Issue',
    message: 'We\'re having trouble accessing your data. Our team has been notified.',
    action: 'Retry Later',
    icon: '💾',
    severity: 'error'
  },

  [ErrorCode.DUPLICATE_RECORD]: {
    title: 'Already Exists',
    message: 'This item already exists in your account. Please choose a different name or identifier.',
    action: 'Use Different Name',
    icon: '📋',
    severity: 'warning'
  },

  [ErrorCode.RECORD_NOT_FOUND]: {
    title: 'Not Found',
    message: 'The item you\'re looking for doesn\'t exist or may have been removed.',
    action: 'Go Back',
    icon: '🔍',
    severity: 'info'
  },

  [ErrorCode.CONSTRAINT_VIOLATION]: {
    title: 'Constraint Error',
    message: 'This action would violate a business rule. Please review your selection.',
    action: 'Review',
    icon: '⚖️',
    severity: 'warning'
  },

  [ErrorCode.BUSINESS_RULE_VIOLATION]: {
    title: 'Business Rule Error',
    message: 'This action is not allowed according to our business rules.',
    action: 'Review Rules',
    icon: '📜',
    severity: 'warning'
  },

  [ErrorCode.INSUFFICIENT_HOURS]: {
    title: 'Not Enough Hours',
    message: 'You don\'t have enough hours available for this booking. Please purchase more hours or choose a shorter session.',
    action: 'Purchase Hours',
    icon: '⏰',
    severity: 'warning'
  },

  [ErrorCode.SCHEDULING_CONFLICT]: {
    title: 'Schedule Conflict',
    message: 'This time slot is no longer available. Please choose a different time.',
    action: 'Choose Different Time',
    icon: '📅',
    severity: 'warning'
  },

  [ErrorCode.ENROLLMENT_LIMIT_EXCEEDED]: {
    title: 'Class Full',
    message: 'This class has reached its maximum capacity. Please choose another class or join the waitlist.',
    action: 'Join Waitlist',
    icon: '👥',
    severity: 'info'
  },

  [ErrorCode.INTERNAL_ERROR]: {
    title: 'System Error',
    message: 'Something went wrong on our end. Our team has been notified and is working on a fix.',
    action: 'Try Again Later',
    icon: '🔧',
    severity: 'error'
  },

  [ErrorCode.SERVICE_UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'This service is temporarily unavailable. Please try again in a few minutes.',
    action: 'Try Again Later',
    icon: '🚫',
    severity: 'error'
  },

  [ErrorCode.CONFIGURATION_ERROR]: {
    title: 'Configuration Issue',
    message: 'There\'s a configuration problem. Please contact support for assistance.',
    action: 'Contact Support',
    icon: '⚙️',
    severity: 'critical'
  },

  [ErrorCode.DEPENDENCY_ERROR]: {
    title: 'Dependency Error',
    message: 'A required service is unavailable. Please try again shortly.',
    action: 'Retry',
    icon: '🔗',
    severity: 'error'
  }
};

/**
 * Context-specific error messages
 */
const CONTEXT_MESSAGES: Record<string, Partial<Record<ErrorCode, ErrorMessageConfig>>> = {
  auth: {
    [ErrorCode.UNAUTHORIZED]: {
      title: 'Please Sign In',
      message: 'You need to be signed in to access HeyPeter Academy.',
      action: 'Sign In',
      icon: '🎓',
      severity: 'warning'
    },
    [ErrorCode.INVALID_CREDENTIALS]: {
      title: 'Sign In Failed',
      message: 'Invalid email or password. Please check your credentials and try again.',
      action: 'Try Again',
      icon: '🔐',
      severity: 'error'
    },
    [ErrorCode.SESSION_EXPIRED]: {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again to continue.',
      action: 'Sign In',
      icon: '⏰',
      severity: 'warning'
    }
  },

  booking: {
    [ErrorCode.INSUFFICIENT_HOURS]: {
      title: 'Not Enough Hours',
      message: 'You need more hours to book this lesson. Purchase a package to continue.',
      action: 'Buy Hours',
      icon: '💰',
      severity: 'warning'
    },
    [ErrorCode.SCHEDULING_CONFLICT]: {
      title: 'Time Unavailable',
      message: 'This time slot is no longer available. Let\'s find you another time.',
      action: 'Find Another Time',
      icon: '📅',
      severity: 'warning'
    },
    [ErrorCode.ENROLLMENT_LIMIT_EXCEEDED]: {
      title: 'Class Full',
      message: 'This class is full, but you can join the waitlist for cancellations.',
      action: 'Join Waitlist',
      icon: '📝',
      severity: 'info'
    }
  },

  payment: {
    [ErrorCode.VALIDATION_ERROR]: {
      title: 'Payment Details Error',
      message: 'Please check your payment information and try again.',
      action: 'Update Payment',
      icon: '💳',
      severity: 'warning'
    },
    [ErrorCode.API_ERROR]: {
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again or use a different payment method.',
      action: 'Try Again',
      icon: '💳',
      severity: 'error'
    }
  },

  profile: {
    [ErrorCode.DUPLICATE_RECORD]: {
      title: 'Email Already Used',
      message: 'This email address is already associated with another account.',
      action: 'Use Different Email',
      icon: '📧',
      severity: 'warning'
    },
    [ErrorCode.VALIDATION_ERROR]: {
      title: 'Profile Error',
      message: 'Please review your profile information and correct any errors.',
      action: 'Review Profile',
      icon: '👤',
      severity: 'warning'
    }
  },

  upload: {
    [ErrorCode.VALIDATION_ERROR]: {
      title: 'File Error',
      message: 'This file type is not supported or the file is too large.',
      action: 'Choose Different File',
      icon: '📁',
      severity: 'warning'
    },
    [ErrorCode.API_ERROR]: {
      title: 'Upload Failed',
      message: 'Your file couldn\'t be uploaded. Please try again.',
      action: 'Try Again',
      icon: '📤',
      severity: 'error'
    }
  }
};

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(
  error: Error | AppError,
  context?: string
): ErrorMessageConfig {
  // Default fallback
  const defaultMessage: ErrorMessageConfig = {
    title: 'Something Went Wrong',
    message: 'We encountered an unexpected error. Please try again, and contact support if the problem persists.',
    action: 'Try Again',
    icon: '⚠️',
    severity: 'error'
  };

  if (!isAppError(error)) {
    return defaultMessage;
  }

  // Check for context-specific message first
  if (context && CONTEXT_MESSAGES[context]?.[error.code]) {
    return CONTEXT_MESSAGES[context][error.code]!;
  }

  // Fall back to general message
  return ERROR_MESSAGES[error.code] || defaultMessage;
}

/**
 * Get detailed error information for development
 */
export function getDetailedErrorInfo(error: Error | AppError): {
  message: ErrorMessageConfig;
  technical: {
    code: string;
    statusCode: number;
    stack?: string;
    context?: any;
  };
  recovery?: {
    canRecover: boolean;
    suggestion: string;
  };
} {
  const message = getUserErrorMessage(error);
  
  const technical = {
    code: isAppError(error) ? error.code : 'UNKNOWN_ERROR',
    statusCode: isAppError(error) ? error.statusCode : 500,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      context: isAppError(error) ? error.context : undefined
    })
  };

  const recovery = getRecoveryInfo(error);

  return {
    message,
    technical,
    recovery
  };
}

/**
 * Get recovery information
 */
function getRecoveryInfo(error: Error | AppError): {
  canRecover: boolean;
  suggestion: string;
} {
  if (!isAppError(error)) {
    return {
      canRecover: false,
      suggestion: 'Please refresh the page or contact support.'
    };
  }

  const recoveryMap: Partial<Record<ErrorCode, { canRecover: boolean; suggestion: string }>> = {
    [ErrorCode.UNAUTHORIZED]: {
      canRecover: true,
      suggestion: 'Please sign in to continue.'
    },
    [ErrorCode.SESSION_EXPIRED]: {
      canRecover: true,
      suggestion: 'Your session has expired. Please sign in again.'
    },
    [ErrorCode.NETWORK_ERROR]: {
      canRecover: true,
      suggestion: 'Check your internet connection and try again.'
    },
    [ErrorCode.TIMEOUT_ERROR]: {
      canRecover: true,
      suggestion: 'The request timed out. Please try again.'
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
      canRecover: true,
      suggestion: 'Please wait a moment before trying again.'
    },
    [ErrorCode.VALIDATION_ERROR]: {
      canRecover: true,
      suggestion: 'Please correct the highlighted fields and try again.'
    },
    [ErrorCode.INSUFFICIENT_HOURS]: {
      canRecover: true,
      suggestion: 'Purchase more hours or choose a shorter session.'
    },
    [ErrorCode.SCHEDULING_CONFLICT]: {
      canRecover: true,
      suggestion: 'Please choose a different time slot.'
    },
    [ErrorCode.SERVICE_UNAVAILABLE]: {
      canRecover: true,
      suggestion: 'Please try again in a few minutes.'
    }
  };

  return recoveryMap[error.code] || {
    canRecover: false,
    suggestion: 'Please refresh the page or contact support if the problem persists.'
  };
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(
  error: Error | AppError,
  context?: string,
  includeDetails: boolean = process.env.NODE_ENV === 'development'
): {
  title: string;
  message: string;
  action?: string;
  icon?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: string;
} {
  const errorMessage = getUserErrorMessage(error, context);
  
  return {
    ...errorMessage,
    ...(includeDetails && {
      details: isAppError(error) ? 
        `Error Code: ${error.code} | Status: ${error.statusCode}` :
        `Error: ${error.message}`
    })
  };
}

/**
 * Get contextual help text
 */
export function getContextualHelp(errorCode: ErrorCode, context?: string): string {
  const helpText: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.INSUFFICIENT_HOURS]: 'You can purchase hour packages from your dashboard. Different class types require different amounts of hours.',
    [ErrorCode.SCHEDULING_CONFLICT]: 'Popular time slots fill up quickly. Try booking in advance or consider alternative times.',
    [ErrorCode.ENROLLMENT_LIMIT_EXCEEDED]: 'Group classes are limited to 9 students. 1-on-1 sessions are always available.',
    [ErrorCode.NETWORK_ERROR]: 'If you\'re on a slow connection, try refreshing the page or switching to a better network.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'This helps us maintain good performance for all users. Please wait a moment.',
    [ErrorCode.VALIDATION_ERROR]: 'Make sure all required fields are filled and formats are correct (e.g., valid email addresses).'
  };

  return helpText[errorCode] || 'If this problem continues, please contact our support team for assistance.';
}