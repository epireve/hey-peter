import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  conflictDetectionService, 
  ConflictError, 
  BookingConflictData, 
  ClassConflictData,
  ConflictDetectionOptions 
} from '@/lib/services/conflict-detection-service';
import { 
  duplicatePreventionService, 
  DuplicateError, 
  EnrollmentDuplicateData, 
  BookingDuplicateData,
  ClassDuplicateData,
  DuplicateCheckOptions 
} from '@/lib/services/duplicate-prevention-service';

export interface ConflictDetectionState {
  isChecking: boolean;
  conflicts: ConflictError[];
  duplicates: DuplicateError[];
  hasErrors: boolean;
  hasWarnings: boolean;
  canProceed: boolean;
  summary: {
    errorCount: number;
    warningCount: number;
    criticalCount: number;
    duplicateCount: number;
    messages: string[];
  };
}

export interface UseConflictDetectionOptions {
  autoCheck?: boolean;
  debounceMs?: number;
  onConflictsDetected?: (conflicts: ConflictError[], duplicates: DuplicateError[]) => void;
  onErrorsChanged?: (hasErrors: boolean) => void;
}

/**
 * Hook for real-time conflict detection and duplicate prevention
 */
export function useConflictDetection(options: UseConflictDetectionOptions = {}) {
  const {
    autoCheck = true,
    debounceMs = 500,
    onConflictsDetected,
    onErrorsChanged
  } = options;

  const [state, setState] = useState<ConflictDetectionState>({
    isChecking: false,
    conflicts: [],
    duplicates: [],
    hasErrors: false,
    hasWarnings: false,
    canProceed: true,
    summary: {
      errorCount: 0,
      warningCount: 0,
      criticalCount: 0,
      duplicateCount: 0,
      messages: []
    }
  });

  // Debounced check timeout
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  /**
   * Update state with new conflicts and duplicates
   */
  const updateState = useCallback((conflicts: ConflictError[], duplicates: DuplicateError[]) => {
    const conflictSummary = conflictDetectionService.getConflictSummary(conflicts);
    const duplicateSummary = duplicatePreventionService.getDuplicateSummary(duplicates);

    const newState: ConflictDetectionState = {
      isChecking: false,
      conflicts,
      duplicates,
      hasErrors: conflictSummary.hasErrors || duplicateSummary.hasErrors,
      hasWarnings: conflictSummary.hasWarnings || duplicateSummary.hasWarnings,
      canProceed: conflictSummary.canProceed && duplicateSummary.canProceed,
      summary: {
        errorCount: conflictSummary.errorCount + duplicateSummary.errorCount,
        warningCount: conflictSummary.warningCount + duplicateSummary.warningCount,
        criticalCount: conflictSummary.criticalCount,
        duplicateCount: duplicates.length,
        messages: [...conflictSummary.messages, ...duplicateSummary.messages]
      }
    };

    setState(newState);

    // Trigger callbacks
    onConflictsDetected?.(conflicts, duplicates);
    onErrorsChanged?.(newState.hasErrors);
  }, [onConflictsDetected, onErrorsChanged]);

  /**
   * Check booking conflicts and duplicates
   */
  const checkBookingConflicts = useCallback(async (
    data: BookingConflictData,
    conflictOptions?: ConflictDetectionOptions,
    duplicateOptions?: DuplicateCheckOptions
  ) => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const [conflicts, duplicates] = await Promise.all([
        conflictDetectionService.checkBookingConflicts(data, conflictOptions),
        duplicatePreventionService.checkBookingDuplicates({
          studentId: data.studentId,
          teacherId: data.teacherId,
          classId: data.classId,
          scheduledAt: data.scheduledAt,
          durationMinutes: data.durationMinutes,
          recurringPattern: data.recurringPattern,
        }, duplicateOptions)
      ]);

      updateState(conflicts, duplicates);
      return { conflicts, duplicates };
    } catch (error) {
      console.error('Error checking booking conflicts:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      throw error;
    }
  }, [updateState]);

  /**
   * Check enrollment conflicts and duplicates
   */
  const checkEnrollmentConflicts = useCallback(async (
    data: EnrollmentDuplicateData,
    duplicateOptions?: DuplicateCheckOptions
  ) => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const duplicates = await duplicatePreventionService.checkEnrollmentDuplicates(data, duplicateOptions);
      updateState([], duplicates);
      return { conflicts: [], duplicates };
    } catch (error) {
      console.error('Error checking enrollment conflicts:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      throw error;
    }
  }, [updateState]);

  /**
   * Check class creation conflicts and duplicates
   */
  const checkClassConflicts = useCallback(async (
    data: ClassConflictData & ClassDuplicateData,
    conflictOptions?: ConflictDetectionOptions,
    duplicateOptions?: DuplicateCheckOptions
  ) => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const [conflicts, duplicates] = await Promise.all([
        conflictDetectionService.checkClassCreationConflicts(data, conflictOptions),
        duplicatePreventionService.checkClassCreationDuplicates(data, duplicateOptions)
      ]);

      updateState(conflicts, duplicates);
      return { conflicts, duplicates };
    } catch (error) {
      console.error('Error checking class conflicts:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      throw error;
    }
  }, [updateState]);

  /**
   * Debounced booking conflict check
   */
  const debouncedBookingCheck = useCallback((
    data: BookingConflictData,
    conflictOptions?: ConflictDetectionOptions,
    duplicateOptions?: DuplicateCheckOptions
  ) => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    const timeout = setTimeout(() => {
      if (autoCheck) {
        checkBookingConflicts(data, conflictOptions, duplicateOptions);
      }
    }, debounceMs);

    setCheckTimeout(timeout);
  }, [checkTimeout, autoCheck, debounceMs, checkBookingConflicts]);

  /**
   * Clear all conflicts and duplicates
   */
  const clearConflicts = useCallback(() => {
    setState({
      isChecking: false,
      conflicts: [],
      duplicates: [],
      hasErrors: false,
      hasWarnings: false,
      canProceed: true,
      summary: {
        errorCount: 0,
        warningCount: 0,
        criticalCount: 0,
        duplicateCount: 0,
        messages: []
      }
    });
  }, []);

  /**
   * Get conflicts by type
   */
  const getConflictsByType = useCallback((type: ConflictError['type']) => {
    return state.conflicts.filter(conflict => conflict.type === type);
  }, [state.conflicts]);

  /**
   * Get duplicates by type
   */
  const getDuplicatesByType = useCallback((type: DuplicateError['type']) => {
    return state.duplicates.filter(duplicate => duplicate.type === type);
  }, [state.duplicates]);

  /**
   * Get all errors (conflicts + duplicates with error severity)
   */
  const getAllErrors = useMemo(() => {
    const conflictErrors = state.conflicts.filter(c => 
      c.severity === 'error' || c.severity === 'critical'
    );
    const duplicateErrors = state.duplicates.filter(d => d.severity === 'error');
    return [...conflictErrors, ...duplicateErrors];
  }, [state.conflicts, state.duplicates]);

  /**
   * Get all warnings
   */
  const getAllWarnings = useMemo(() => {
    const conflictWarnings = state.conflicts.filter(c => c.severity === 'warning');
    const duplicateWarnings = state.duplicates.filter(d => d.severity === 'warning');
    return [...conflictWarnings, ...duplicateWarnings];
  }, [state.conflicts, state.duplicates]);

  /**
   * Get suggested alternatives from conflicts
   */
  const getSuggestedAlternatives = useMemo(() => {
    const alternatives: string[] = [];
    
    state.conflicts.forEach(conflict => {
      if (conflict.details.suggestedAlternatives) {
        alternatives.push(...conflict.details.suggestedAlternatives);
      }
    });

    return alternatives;
  }, [state.conflicts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
  }, [checkTimeout]);

  return {
    // State
    ...state,
    
    // Actions
    checkBookingConflicts,
    checkEnrollmentConflicts,
    checkClassConflicts,
    debouncedBookingCheck,
    clearConflicts,
    
    // Helpers
    getConflictsByType,
    getDuplicatesByType,
    getAllErrors,
    getAllWarnings,
    getSuggestedAlternatives,
  };
}

/**
 * Hook for batch conflict detection
 */
export function useBatchConflictDetection() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<Map<string, { conflicts: ConflictError[], duplicates: DuplicateError[] }>>(new Map());

  const checkBatchBookings = useCallback(async (
    bookings: BookingConflictData[],
    conflictOptions?: ConflictDetectionOptions,
    duplicateOptions?: DuplicateCheckOptions
  ) => {
    setIsChecking(true);
    const batchResults = new Map();

    try {
      const conflictResults = await conflictDetectionService.checkBatchBookingConflicts(bookings, conflictOptions);
      
      for (const [index, booking] of bookings.entries()) {
        const key = `booking_${index}`;
        const conflicts = conflictResults.get(key) || [];
        
        const duplicates = await duplicatePreventionService.checkBookingDuplicates({
          studentId: booking.studentId,
          teacherId: booking.teacherId,
          classId: booking.classId,
          scheduledAt: booking.scheduledAt,
          durationMinutes: booking.durationMinutes,
          recurringPattern: booking.recurringPattern,
        }, duplicateOptions);

        batchResults.set(key, { conflicts, duplicates });
      }

      setResults(batchResults);
      return batchResults;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearBatchResults = useCallback(() => {
    setResults(new Map());
  }, []);

  return {
    isChecking,
    results,
    checkBatchBookings,
    clearBatchResults,
  };
}

/**
 * Hook for real-time validation during form input
 */
export function useRealTimeValidation<T>(
  validator: (data: T) => Promise<{ conflicts: ConflictError[], duplicates: DuplicateError[] }>,
  options: UseConflictDetectionOptions = {}
) {
  const { debounceMs = 1000 } = options;
  const [validationState, setValidationState] = useState<ConflictDetectionState>({
    isChecking: false,
    conflicts: [],
    duplicates: [],
    hasErrors: false,
    hasWarnings: false,
    canProceed: true,
    summary: {
      errorCount: 0,
      warningCount: 0,
      criticalCount: 0,
      duplicateCount: 0,
      messages: []
    }
  });

  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateData = useCallback((data: T) => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(async () => {
      setValidationState(prev => ({ ...prev, isChecking: true }));

      try {
        const { conflicts, duplicates } = await validator(data);
        
        const conflictSummary = conflictDetectionService.getConflictSummary(conflicts);
        const duplicateSummary = duplicatePreventionService.getDuplicateSummary(duplicates);

        setValidationState({
          isChecking: false,
          conflicts,
          duplicates,
          hasErrors: conflictSummary.hasErrors || duplicateSummary.hasErrors,
          hasWarnings: conflictSummary.hasWarnings || duplicateSummary.hasWarnings,
          canProceed: conflictSummary.canProceed && duplicateSummary.canProceed,
          summary: {
            errorCount: conflictSummary.errorCount + duplicateSummary.errorCount,
            warningCount: conflictSummary.warningCount + duplicateSummary.warningCount,
            criticalCount: conflictSummary.criticalCount,
            duplicateCount: duplicates.length,
            messages: [...conflictSummary.messages, ...duplicateSummary.messages]
          }
        });
      } catch (error) {
        console.error('Validation error:', error);
        setValidationState(prev => ({ ...prev, isChecking: false }));
      }
    }, debounceMs);

    setValidationTimeout(timeout);
  }, [validator, debounceMs, validationTimeout]);

  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  return {
    ...validationState,
    validateData,
  };
}