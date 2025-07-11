import { useState, useCallback, useEffect } from 'react';
import { useForm as useReactHookForm, UseFormReturn, FieldValues, Path, PathValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

export interface FormConfig<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  defaultValues?: Partial<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
  shouldUseNativeValidation?: boolean;
  criteriaMode?: 'firstError' | 'all';
  delayError?: number;
}

export interface FormOptions<T extends FieldValues> {
  onSubmit?: (data: T) => Promise<void> | void;
  onError?: (errors: any) => void;
  onSuccess?: (data: T) => void;
  transformData?: (data: T) => T;
  resetOnSuccess?: boolean;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  loadingDelay?: number;
}

export interface UseFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  // Enhanced form state
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  isLoading: boolean;
  
  // Form actions
  submitForm: () => Promise<void>;
  resetForm: () => void;
  clearErrors: () => void;
  setFormData: (data: Partial<T>) => void;
  
  // Field utilities
  getFieldError: (fieldName: Path<T>) => string | undefined;
  setFieldValue: (fieldName: Path<T>, value: PathValue<T, Path<T>>) => void;
  getFieldValue: (fieldName: Path<T>) => any;
  validateField: (fieldName: Path<T>) => Promise<boolean>;
  
  // Form validation
  validateForm: () => Promise<boolean>;
  validateOnChange: (fieldName: Path<T>) => (value: any) => Promise<void>;
  
  // Auto-save functionality
  enableAutoSave: (callback: (data: T) => void, delay?: number) => void;
  disableAutoSave: () => void;
  
  // Form state utilities
  getFormData: () => T;
  getChangedFields: () => Partial<T>;
  hasUnsavedChanges: () => boolean;
  
  // Form persistence
  saveToStorage: (key: string) => void;
  loadFromStorage: (key: string) => void;
  clearStorage: (key: string) => void;
}

export const useForm = <T extends FieldValues>(
  config: FormConfig<T>,
  options: FormOptions<T> = {}
): UseFormReturn<T> => {
  const form = useReactHookForm<T>({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaultValues,
    mode: config.mode || 'onBlur',
    reValidateMode: config.reValidateMode || 'onChange',
    shouldFocusError: config.shouldFocusError !== false,
    shouldUnregister: config.shouldUnregister,
    shouldUseNativeValidation: config.shouldUseNativeValidation,
    criteriaMode: config.criteriaMode || 'firstError',
    delayError: config.delayError,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialData, setInitialData] = useState<T | null>(null);

  const { 
    handleSubmit, 
    reset, 
    clearErrors: clearFormErrors,
    setValue,
    getValue,
    trigger,
    formState: { isValid, isDirty, errors },
    watch,
    getValues,
  } = form;

  const hasErrors = Object.keys(errors).length > 0;

  // Store initial form data for comparison
  useEffect(() => {
    if (config.defaultValues && !initialData) {
      setInitialData(config.defaultValues as T);
    }
  }, [config.defaultValues, initialData]);

  // Submit form handler
  const submitForm = useCallback(async () => {
    if (!options.onSubmit) return;

    setIsSubmitting(true);
    
    try {
      // Add loading delay if specified
      if (options.loadingDelay) {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, options.loadingDelay));
      }

      const isFormValid = await trigger();
      
      if (!isFormValid) {
        if (options.showErrorToast !== false) {
          toast.error('Please fix the errors in the form');
        }
        return;
      }

      const formData = getValues();
      const transformedData = options.transformData ? options.transformData(formData) : formData;
      
      await options.onSubmit(transformedData);
      
      if (options.onSuccess) {
        options.onSuccess(transformedData);
      }
      
      if (options.resetOnSuccess) {
        reset();
      }
      
      if (options.showSuccessToast !== false) {
        toast.success('Form submitted successfully');
      }
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      }
      
      if (options.showErrorToast !== false) {
        toast.error(error instanceof Error ? error.message : 'An error occurred');
      }
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  }, [options, trigger, getValues, reset]);

  // Reset form
  const resetForm = useCallback(() => {
    reset(config.defaultValues);
  }, [reset, config.defaultValues]);

  // Clear errors
  const clearErrors = useCallback(() => {
    clearFormErrors();
  }, [clearFormErrors]);

  // Set form data
  const setFormData = useCallback((data: Partial<T>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as Path<T>, value, { shouldValidate: true, shouldDirty: true });
    });
  }, [setValue]);

  // Get field error
  const getFieldError = useCallback((fieldName: Path<T>) => {
    const error = errors[fieldName];
    return error?.message as string | undefined;
  }, [errors]);

  // Set field value
  const setFieldValue = useCallback((fieldName: Path<T>, value: PathValue<T, Path<T>>) => {
    setValue(fieldName, value, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  // Get field value
  const getFieldValue = useCallback((fieldName: Path<T>) => {
    return getValue(fieldName);
  }, [getValue]);

  // Validate field
  const validateField = useCallback(async (fieldName: Path<T>) => {
    const result = await trigger(fieldName);
    return result;
  }, [trigger]);

  // Validate form
  const validateForm = useCallback(async () => {
    const result = await trigger();
    return result;
  }, [trigger]);

  // Validate on change
  const validateOnChange = useCallback((fieldName: Path<T>) => {
    return async (value: any) => {
      setValue(fieldName, value, { shouldValidate: true });
      await trigger(fieldName);
    };
  }, [setValue, trigger]);

  // Auto-save functionality
  const enableAutoSave = useCallback((callback: (data: T) => void, delay: number = 1000) => {
    const subscription = watch((data) => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        callback(data as T);
      }, delay);
      
      setAutoSaveTimer(timer);
    });

    return subscription;
  }, [watch, autoSaveTimer]);

  const disableAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      setAutoSaveTimer(null);
    }
  }, [autoSaveTimer]);

  // Get form data
  const getFormData = useCallback(() => {
    return getValues();
  }, [getValues]);

  // Get changed fields
  const getChangedFields = useCallback(() => {
    const currentData = getValues();
    const changedFields: Partial<T> = {};
    
    if (initialData) {
      Object.keys(currentData).forEach(key => {
        if (currentData[key] !== initialData[key]) {
          changedFields[key as keyof T] = currentData[key];
        }
      });
    }
    
    return changedFields;
  }, [getValues, initialData]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return isDirty;
  }, [isDirty]);

  // Form persistence
  const saveToStorage = useCallback((key: string) => {
    const formData = getValues();
    localStorage.setItem(key, JSON.stringify(formData));
  }, [getValues]);

  const loadFromStorage = useCallback((key: string) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFormData(data);
      } catch (error) {
        console.error('Failed to load form data from storage:', error);
      }
    }
  }, [setFormData]);

  const clearStorage = useCallback((key: string) => {
    localStorage.removeItem(key);
  }, []);

  return {
    ...form,
    // Enhanced form state
    isSubmitting,
    isValid,
    isDirty,
    hasErrors,
    isLoading,
    
    // Form actions
    submitForm,
    resetForm,
    clearErrors,
    setFormData,
    
    // Field utilities
    getFieldError,
    setFieldValue,
    getFieldValue,
    validateField,
    
    // Form validation
    validateForm,
    validateOnChange,
    
    // Auto-save functionality
    enableAutoSave,
    disableAutoSave,
    
    // Form state utilities
    getFormData,
    getChangedFields,
    hasUnsavedChanges,
    
    // Form persistence
    saveToStorage,
    loadFromStorage,
    clearStorage,
  };
};

// Common form schemas
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: (passwordField: string = 'password') => 
    z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  date: z.string().datetime('Invalid date'),
  number: z.number().min(0, 'Must be a positive number'),
  positiveInteger: z.number().int().min(1, 'Must be a positive integer'),
  percentage: z.number().min(0, 'Must be at least 0%').max(100, 'Must be at most 100%'),
  currency: z.number().min(0, 'Amount must be positive'),
  required: (message: string = 'This field is required') => z.string().min(1, message),
  optional: z.string().optional(),
  select: (options: string[], message: string = 'Please select an option') => 
    z.enum(options as [string, ...string[]], { errorMap: () => ({ message }) }),
  multiSelect: (options: string[]) => z.array(z.enum(options as [string, ...string[]])),
  file: z.any().refine((file) => file instanceof File, 'Please select a file'),
  image: z.any().refine(
    (file) => file instanceof File && file.type.startsWith('image/'),
    'Please select an image file'
  ),
  checkbox: z.boolean(),
  requiredCheckbox: z.boolean().refine((value) => value === true, 'This field is required'),
};

// Utility function to create validation schemas
export const createValidationSchema = <T extends Record<string, any>>(
  fields: T
): z.ZodObject<{ [K in keyof T]: z.ZodType<T[K]> }> => {
  return z.object(fields) as any;
};

// Common form patterns
export const useStudentForm = (initialData?: any) => {
  const schema = createValidationSchema({
    email: commonSchemas.email,
    full_name: commonSchemas.name,
    password: commonSchemas.password,
    internal_code: commonSchemas.required('Internal code is required'),
    test_level: commonSchemas.select(['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1']).optional(),
    course_type: commonSchemas.select(['Online', 'Offline']).optional(),
    total_hours: commonSchemas.number,
    gender: commonSchemas.select(['male', 'female', 'other']).optional(),
    purchased_materials: commonSchemas.checkbox,
    payment_amount: commonSchemas.currency.optional(),
    discount: commonSchemas.percentage.optional(),
  });

  return useForm({
    schema,
    defaultValues: initialData,
  });
};

export const useTeacherForm = (initialData?: any) => {
  const schema = createValidationSchema({
    email: commonSchemas.email,
    full_name: commonSchemas.name,
    password: commonSchemas.password,
    internal_code: commonSchemas.required('Internal code is required'),
    specialization: commonSchemas.optional,
    hourly_rate: commonSchemas.currency.optional(),
    max_hours_per_week: commonSchemas.positiveInteger.optional(),
    experience_level: commonSchemas.select(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    bio: commonSchemas.optional,
    phone: commonSchemas.phone.optional(),
  });

  return useForm({
    schema,
    defaultValues: initialData,
  });
};

export const useLoginForm = () => {
  const schema = createValidationSchema({
    email: commonSchemas.email,
    password: commonSchemas.password,
  });

  return useForm({
    schema,
    defaultValues: { email: '', password: '' },
  });
};

export const usePasswordResetForm = () => {
  const schema = createValidationSchema({
    email: commonSchemas.email,
  });

  return useForm({
    schema,
    defaultValues: { email: '' },
  });
};

export const useChangePasswordForm = () => {
  const schema = createValidationSchema({
    currentPassword: commonSchemas.password,
    newPassword: commonSchemas.password,
    confirmPassword: commonSchemas.password,
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  return useForm({
    schema,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
};

export const useProfileForm = (initialData?: any) => {
  const schema = createValidationSchema({
    full_name: commonSchemas.name,
    first_name: commonSchemas.name.optional(),
    last_name: commonSchemas.name.optional(),
    email: commonSchemas.email,
    phone: commonSchemas.phone.optional(),
    bio: commonSchemas.optional,
    avatar_url: commonSchemas.url.optional(),
  });

  return useForm({
    schema,
    defaultValues: initialData,
  });
};