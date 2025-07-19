"use client";

import * as React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Simple component imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, Form } from "@/components/ui/form-field";

// Simplified field types
export type FieldType = "text" | "email" | "password" | "number" | "textarea" | "select" | "checkbox" | "radio" | "switch";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

// Simplified field configuration
export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[]; // Only for select/radio fields
  validation?: z.ZodTypeAny;
  description?: string;
}

// Simplified form configuration
export interface SimpleDynamicFormProps {
  fields: FieldConfig[];
  onSubmit: (data: FieldValues) => void | Promise<void>;
  defaultValues?: Record<string, any>;
  submitLabel?: string;
  loading?: boolean;
  className?: string;
}

// Single field renderer - much simpler
const FieldRenderer: React.FC<{ field: FieldConfig; form: any }> = ({ field, form }) => {
  const renderInput = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "number":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        );
      
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        );
      
      case "select":
        return (
          <Select disabled={field.disabled}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled={field.disabled} />
            {field.label && (
              <label className="text-sm font-medium">
                {field.label}
              </label>
            )}
          </div>
        );
      
      case "radio":
        return (
          <RadioGroup disabled={field.disabled}>
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} disabled={option.disabled} />
                <label className="text-sm font-medium">{option.label}</label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case "switch":
        return (
          <div className="flex items-center space-x-2">
            <Switch disabled={field.disabled} />
            {field.label && (
              <label className="text-sm font-medium">{field.label}</label>
            )}
          </div>
        );
      
      default:
        return <Input placeholder={field.placeholder} disabled={field.disabled} />;
    }
  };

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          {field.type !== "checkbox" && field.type !== "switch" && field.label && (
            <FormLabel>{field.label}</FormLabel>
          )}
          <FormControl>
            {React.cloneElement(renderInput() as React.ReactElement, {
              ...formField,
            })}
          </FormControl>
          {field.description && <FormDescription>{field.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// Simple schema generator
const generateSchema = (fields: FieldConfig[]): z.ZodSchema => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach((field) => {
    if (field.validation) {
      schemaFields[field.name] = field.validation;
      return;
    }
    
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case "email":
        fieldSchema = field.required 
          ? z.string().email("Invalid email address")
          : z.string().email("Invalid email address").optional();
        break;
      case "password":
        fieldSchema = field.required
          ? z.string().min(8, "Password must be at least 8 characters")
          : z.string().min(8, "Password must be at least 8 characters").optional();
        break;
      case "number":
        fieldSchema = field.required
          ? z.coerce.number()
          : z.coerce.number().optional();
        break;
      case "checkbox":
      case "switch":
        fieldSchema = field.required
          ? z.boolean().refine((val) => val === true, { message: "This field is required" })
          : z.boolean().optional();
        break;
      default:
        fieldSchema = field.required
          ? z.string().min(1, "This field is required")
          : z.string().optional();
        break;
    }
    
    schemaFields[field.name] = fieldSchema;
  });
  
  return z.object(schemaFields);
};

// Main simplified component
export const SimpleDynamicForm: React.FC<SimpleDynamicFormProps> = ({
  fields,
  onSubmit,
  defaultValues = {},
  submitLabel = "Submit",
  loading = false,
  className,
}) => {
  const schema = React.useMemo(() => generateSchema(fields), [fields]);
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: FieldValues) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-4", className)}>
        {fields.map((field) => (
          <FieldRenderer key={field.name} field={field} form={form} />
        ))}
        
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
};

// Helper functions for common field types
export const createTextField = (name: string, label?: string, required = false): FieldConfig => ({
  name,
  type: "text",
  label,
  required,
});

export const createEmailField = (name: string, label = "Email", required = true): FieldConfig => ({
  name,
  type: "email",
  label,
  required,
});

export const createPasswordField = (name: string, label = "Password", required = true): FieldConfig => ({
  name,
  type: "password",
  label,
  required,
});

export const createSelectField = (name: string, options: SelectOption[], label?: string, required = false): FieldConfig => ({
  name,
  type: "select",
  label,
  options,
  required,
});

export const createCheckboxField = (name: string, label: string, required = false): FieldConfig => ({
  name,
  type: "checkbox",
  label,
  required,
});

export default SimpleDynamicForm;
