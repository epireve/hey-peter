'use client';

// ========================================
// Popup Renderer Component
// Mobile-responsive popup component with multiple template types
// ========================================

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  PopupVariation,
  FormField,
  TrackDisplayRequest,
  TrackInteractionRequest,
  SubmitLeadRequest,
  PopupComponentProps
} from '@/types/popup-marketing';

interface FormData {
  [key: string]: string | string[] | boolean;
}

interface FormErrors {
  [key: string]: string;
}

export function PopupRenderer({
  variation,
  onDisplay,
  onInteraction,
  onSubmit,
  onClose,
  isVisible
}: PopupComponentProps) {
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const displayStartTime = useRef<number>(Date.now());

  // Initialize form data with default values
  useEffect(() => {
    const initialData: FormData = {};
    variation.form_fields.forEach(field => {
      if (field.defaultValue) {
        initialData[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        initialData[field.name] = false;
      }
    });
    setFormData(initialData);
  }, [variation.form_fields]);

  // Track display when popup becomes visible
  useEffect(() => {
    if (isVisible) {
      displayStartTime.current = Date.now();
      // onDisplay will be called by parent component
    }
  }, [isVisible]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        variation.template_type === 'modal'
      ) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, variation.template_type]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  const handleInputChange = (name: string, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    variation.form_fields.forEach(field => {
      const value = formData[field.name];

      // Required field validation
      if (field.required) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors[field.name] = `${field.label} is required`;
          return;
        }
      }

      // Type-specific validation
      if (value && typeof value === 'string') {
        // Email validation
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field.name] = 'Please enter a valid email address';
          }
        }

        // Phone validation
        if (field.type === 'tel') {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            errors[field.name] = 'Please enter a valid phone number';
          }
        }

        // Pattern validation
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors[field.name] = `${field.label} format is invalid`;
          }
        }

        // Length validation
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          errors[field.name] = `${field.label} must be at least ${field.validation.minLength} characters`;
        }

        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          errors[field.name] = `${field.label} must not exceed ${field.validation.maxLength} characters`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Track interaction
      onInteraction({
        display_id: '', // Will be set by parent
        interaction_type: 'clicked',
        time_to_interaction: Date.now() - displayStartTime.current
      });

      // Submit lead
      const leadData: Omit<SubmitLeadRequest, 'display_id' | 'campaign_id' | 'variation_id'> = {
        email: formData.email as string,
        first_name: formData.first_name as string,
        last_name: formData.last_name as string,
        phone: formData.phone as string,
        company: formData.company as string,
        interests: Array.isArray(formData.interests) ? formData.interests : [],
        course_preferences: Array.isArray(formData.course_preferences) ? formData.course_preferences : [],
        preferred_contact_method: formData.preferred_contact_method as string || 'email',
        marketing_consent: formData.marketing_consent as boolean || false,
        gdpr_compliant: true
      };

      onSubmit(leadData as SubmitLeadRequest);
      
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onInteraction({
      display_id: '', // Will be set by parent
      interaction_type: 'dismissed',
      time_to_interaction: Date.now() - displayStartTime.current
    });
    onClose();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    onInteraction({
      display_id: '', // Will be set by parent
      interaction_type: 'dismissed',
      time_to_interaction: Date.now() - displayStartTime.current
    });
  };

  const renderFormField = (field: FormField) => {
    const error = formErrors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={formData[field.name] as string || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={cn(error && 'border-red-500')}
              required={field.required}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.description && (
              <p className="text-xs text-gray-600">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name] as string || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={cn(error && 'border-red-500')}
              required={field.required}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.description && (
              <p className="text-xs text-gray-600">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formData[field.name] as string || ''}
              onValueChange={(value) => handleInputChange(field.name, value)}
            >
              <SelectTrigger className={cn(error && 'border-red-500')}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.description && (
              <p className="text-xs text-gray-600">{field.description}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id={field.id}
                checked={formData[field.name] as boolean || false}
                onCheckedChange={(checked) => handleInputChange(field.name, checked)}
                className={cn(error && 'border-red-500')}
                required={field.required}
              />
              <div className="flex-1">
                <Label
                  htmlFor={field.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.description && (
                  <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={formData[field.name] as string || ''}
              onValueChange={(value) => handleInputChange(field.name, value)}
              className={cn(error && 'border border-red-500 rounded p-2')}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.description && (
              <p className="text-xs text-gray-600">{field.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  const { design_config, content_config, cta_config } = variation;

  // Get computed styles
  const getPopupStyles = () => {
    const styles: React.CSSProperties = {
      backgroundColor: design_config.backgroundColor || '#ffffff',
      color: design_config.textColor || '#000000',
      borderRadius: design_config.borderRadius || 8,
      borderColor: design_config.borderColor,
      borderWidth: design_config.borderWidth,
      boxShadow: design_config.boxShadow || '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      maxWidth: design_config.maxWidth || 500,
      maxHeight: design_config.maxHeight || '90vh'
    };

    return styles;
  };

  const getAnimationClass = () => {
    const animation = design_config.animation?.entrance || 'fade';
    return `animate-${animation}-in`;
  };

  // Render based on template type
  const renderPopupContent = () => (
    <div
      ref={popupRef}
      className={cn(
        'relative bg-white rounded-lg shadow-xl overflow-hidden',
        getAnimationClass(),
        variation.template_type === 'modal' && 'w-full max-w-md mx-auto',
        variation.template_type === 'banner' && 'w-full',
        variation.template_type === 'slide_in' && 'w-full max-w-sm',
        variation.template_type === 'corner' && 'w-80',
        variation.template_type === 'fullscreen' && 'w-full h-full',
        isMinimized && 'h-16 overflow-hidden'
      )}
      style={getPopupStyles()}
    >
      {/* Close Button */}
      {cta_config.closeButton?.enabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className={cn(
            'absolute z-10 p-1 h-8 w-8',
            cta_config.closeButton.position === 'top-right' && 'top-2 right-2',
            cta_config.closeButton.position === 'top-left' && 'top-2 left-2'
          )}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Minimize Button for certain types */}
      {(variation.template_type === 'corner' || variation.template_type === 'slide_in') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMinimize}
          className="absolute top-2 right-10 z-10 p-1 h-8 w-8"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}

      <div className={cn('p-6', isMinimized && 'p-2')}>
        {!isMinimized && (
          <>
            {/* Logo */}
            {content_config.logo && (
              <div className={cn(
                'mb-4',
                content_config.logo.position === 'top' && 'text-center',
                content_config.logo.position === 'bottom' && 'order-last'
              )}>
                <img
                  src={content_config.logo.url}
                  alt={content_config.logo.alt}
                  className="h-8 w-auto mx-auto"
                />
              </div>
            )}

            {/* Image */}
            {content_config.image && (
              <div className={cn(
                'mb-4',
                content_config.image.position === 'top' && 'mb-6',
                content_config.image.position === 'left' && 'float-left mr-4 mb-2',
                content_config.image.position === 'right' && 'float-right ml-4 mb-2'
              )}>
                <img
                  src={content_config.image.url}
                  alt={content_config.image.alt}
                  className={cn(
                    'rounded',
                    content_config.image.position === 'top' && 'w-full h-48 object-cover',
                    (content_config.image.position === 'left' || content_config.image.position === 'right') && 'w-24 h-24 object-cover'
                  )}
                />
              </div>
            )}

            {/* Headline */}
            <h2 className="text-2xl font-bold mb-2 leading-tight">
              {content_config.headline}
            </h2>

            {/* Subheadline */}
            {content_config.subheadline && (
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                {content_config.subheadline}
              </h3>
            )}

            {/* Description */}
            {content_config.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {content_config.description}
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {variation.form_fields.map(renderFormField)}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                style={{
                  backgroundColor: cta_config.primaryButton.backgroundColor,
                  color: cta_config.primaryButton.color,
                  borderColor: cta_config.primaryButton.borderColor
                }}
              >
                {isSubmitting ? 'Submitting...' : cta_config.primaryButton.text}
              </Button>

              {/* Secondary Button */}
              {cta_config.secondaryButton && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (cta_config.secondaryButton?.action === 'close') {
                      handleClose();
                    } else if (cta_config.secondaryButton?.action === 'minimize') {
                      handleMinimize();
                    } else if (cta_config.secondaryButton?.action === 'redirect' && cta_config.secondaryButton.redirectUrl) {
                      window.open(cta_config.secondaryButton.redirectUrl, '_blank');
                    }
                  }}
                  className="w-full"
                  style={{
                    backgroundColor: cta_config.secondaryButton.backgroundColor,
                    color: cta_config.secondaryButton.color,
                    borderColor: cta_config.secondaryButton.borderColor
                  }}
                >
                  {cta_config.secondaryButton.text}
                </Button>
              )}
            </form>

            {/* Disclaimer */}
            {content_config.disclaimerText && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                {content_config.disclaimerText}
              </p>
            )}
          </>
        )}

        {/* Minimized state */}
        {isMinimized && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">
              {content_config.headline}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="p-1 h-6 w-6"
            >
              <ChevronDown className="h-3 w-3 rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Position-specific wrappers
  switch (variation.template_type) {
    case 'modal':
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          {design_config.overlay?.enabled && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: design_config.overlay.color || '#000000',
                opacity: design_config.overlay.opacity || 0.5
              }}
              onClick={handleClose}
            />
          )}
          <div className="relative z-10 w-full max-w-md">
            {renderPopupContent()}
          </div>
        </div>
      );

    case 'banner':
      return (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          {renderPopupContent()}
        </div>
      );

    case 'slide_in':
      return (
        <div className="fixed bottom-4 right-4 z-50">
          {renderPopupContent()}
        </div>
      );

    case 'corner':
      return (
        <div className="fixed bottom-4 right-4 z-50">
          {renderPopupContent()}
        </div>
      );

    case 'fullscreen':
      return (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            {renderPopupContent()}
          </div>
        </div>
      );

    default:
      return null;
  }
}