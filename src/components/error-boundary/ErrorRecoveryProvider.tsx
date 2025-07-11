'use client';

import { logger } from '@/lib/services';

import React, { createContext, useContext, useCallback, useState } from 'react';
import type { ErrorRecoveryStrategy, ErrorType } from './types';

interface ErrorRecoveryContextValue {
  strategies: Map<ErrorType, ErrorRecoveryStrategy>;
  registerStrategy: (strategy: ErrorRecoveryStrategy) => void;
  unregisterStrategy: (type: ErrorType) => void;
  attemptRecovery: (error: Error, type: ErrorType) => Promise<boolean>;
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextValue | null>(null);

export function useErrorRecovery() {
  const context = useContext(ErrorRecoveryContext);
  if (!context) {
    throw new Error('useErrorRecovery must be used within ErrorRecoveryProvider');
  }
  return context;
}

// Default recovery strategies
const defaultStrategies: ErrorRecoveryStrategy[] = [
  {
    type: 'network',
    canRecover: (error) => {
      return error.message.toLowerCase().includes('network') || 
             error.message.toLowerCase().includes('fetch');
    },
    recover: async (error) => {
      // Wait a bit and let the component retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    },
    maxAttempts: 3
  },
  {
    type: 'chunk-load',
    canRecover: (error) => {
      return error.message.toLowerCase().includes('chunk') ||
             error.message.toLowerCase().includes('loading css chunk');
    },
    recover: async (error) => {
      // For chunk load errors, we need to reload the page
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return false; // Page will reload
    },
    maxAttempts: 1
  },
  {
    type: 'timeout',
    canRecover: (error) => {
      return error.message.toLowerCase().includes('timeout');
    },
    recover: async (error) => {
      // Wait longer before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    },
    maxAttempts: 2
  }
];

export function ErrorRecoveryProvider({ children }: { children: React.ReactNode }) {
  const [strategies] = useState(() => {
    const map = new Map<ErrorType, ErrorRecoveryStrategy>();
    defaultStrategies.forEach(strategy => {
      map.set(strategy.type, strategy);
    });
    return map;
  });

  const registerStrategy = useCallback((strategy: ErrorRecoveryStrategy) => {
    strategies.set(strategy.type, strategy);
  }, [strategies]);

  const unregisterStrategy = useCallback((type: ErrorType) => {
    strategies.delete(type);
  }, [strategies]);

  const attemptRecovery = useCallback(async (error: Error, type: ErrorType): Promise<boolean> => {
    const strategy = strategies.get(type);
    
    if (!strategy || !strategy.canRecover(error)) {
      return false;
    }

    try {
      return await strategy.recover(error);
    } catch (recoveryError) {
      logger.error('Recovery strategy failed:', recoveryError);
      return false;
    }
  }, [strategies]);

  return (
    <ErrorRecoveryContext.Provider
      value={{
        strategies,
        registerStrategy,
        unregisterStrategy,
        attemptRecovery
      }}
    >
      {children}
    </ErrorRecoveryContext.Provider>
  );
}