"use client";

import * as React from "react";
import { useForm, UseFormReturn, FieldValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Component imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
} from "@/components/ui/date-picker";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Form,
} from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

// Field type definitions
export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "switch"
  | "file"
  | "date"
  | "daterange"
  | "datetime"
  | "hidden"
  | "section";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface BaseFieldConfig {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  validation?: z.ZodTypeAny;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "email" | "password" | "hidden";
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea";
  rows?: number;
  maxLength?: number;
  minLength?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select" | "multiselect";
  options: SelectOption[];
  multiple?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  checkboxLabel?: string;
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  options: SelectOption[];
}

export interface SwitchFieldConfig extends BaseFieldConfig {
  type: "switch";
  switchLabel?: string;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: "file";
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date" | "daterange" | "datetime";
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
}

export interface SectionFieldConfig extends BaseFieldConfig {
  type: "section";
  title?: string;
  description?: string;
  fields: FieldConfig[];
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | RadioFieldConfig
  | SwitchFieldConfig
  | FileFieldConfig
  | DateFieldConfig
  | SectionFieldConfig;

export interface FormSection {
  title?: string;
  description?: string;
  fields: FieldConfig[];
  className?: string;
}

export interface DynamicFormConfig {
  sections?: FormSection[];
  fields?: FieldConfig[];
  schema?: z.ZodSchema;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  className?: string;
  onSubmit?: (
    data: any,
    event?: React.BaseSyntheticEvent
  ) => void | Promise<void>;
  onReset?: () => void;
  defaultValues?: Record<string, any>;
}

// Field renderer component
interface FieldRendererProps {
  field: FieldConfig;
  form: UseFormReturn<any>;
  index?: number;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({ field, form }) => {
  const renderFieldContent = () => {
    switch (field.type) {
      case "section":
        const sectionField = field as SectionFieldConfig;
        return (
          <div className="border-b pb-4 mb-4">
            {sectionField.title && (
              <h3 className="text-lg font-medium mb-2">{sectionField.title}</h3>
            )}
            {sectionField.description && (
              <p className="text-sm text-muted-foreground">
                {sectionField.description}
              </p>
            )}
          </div>
        );

      case "text":
      case "email":
      case "password":
      case "hidden":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            disabled={field.disabled}
            maxLength={(field as TextFieldConfig).maxLength}
            className={field.className}
          />
        );

      case "number":
        const numberField = field as NumberFieldConfig;
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            disabled={field.disabled}
            min={numberField.min}
            max={numberField.max}
            step={numberField.step}
            className={field.className}
          />
        );

      case "textarea":
        const textareaField = field as TextareaFieldConfig;
        return (
          <Textarea
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={textareaField.rows}
            maxLength={textareaField.maxLength}
            className={field.className}
          />
        );

      case "select":
        const selectField = field as SelectFieldConfig;
        return (
          <Select disabled={field.disabled}>
            <SelectTrigger className={field.className}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectField.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        const checkboxField = field as CheckboxFieldConfig;
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled={field.disabled} className={field.className} />
            {checkboxField.checkboxLabel && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {checkboxField.checkboxLabel}
              </label>
            )}
          </div>
        );

      case "radio":
        const radioField = field as RadioFieldConfig;
        return (
          <RadioGroup disabled={field.disabled} className={field.className}>
            {radioField.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  disabled={option.disabled}
                />
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        );

      case "switch":
        const switchField = field as SwitchFieldConfig;
        return (
          <div className="flex items-center space-x-2">
            <Switch disabled={field.disabled} className={field.className} />
            {switchField.switchLabel && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {switchField.switchLabel}
              </label>
            )}
          </div>
        );

      case "date":
        const dateField = field as DateFieldConfig;
        return (
          <DatePicker disabled={field.disabled} className={field.className} />
        );

      case "daterange":
        return (
          <DateRangePicker
            disabled={field.disabled}
            className={field.className}
          />
        );

      case "datetime":
        return (
          <DateTimePicker
            disabled={field.disabled}
            className={field.className}
          />
        );

      case "file":
        const fileField = field as FileFieldConfig;
        return (
          <FileUpload
            accept={fileField.accept}
            multiple={fileField.multiple}
            maxSize={fileField.maxSize}
            maxFiles={fileField.maxFiles}
            disabled={field.disabled}
            className={field.className}
          />
        );

      default:
        return (
          <Input
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={field.className}
          />
        );
    }
  };

  if (field.type === "hidden") {
    return (
      <FormField
        control={form.control}
        name={field.name as Path<any>}
        render={({ field: formField }) => (
          <input type="hidden" {...formField} />
        )}
      />
    );
  }

  if (field.type === "section") {
    return <div>{renderFieldContent()}</div>;
  }

  return (
    <FormField
      control={form.control}
      name={field.name as Path<any>}
      render={({ field: formField }) => (
        <FormItem className={cn("space-y-2", field.className)}>
          {field.label && <FormLabel>{field.label}</FormLabel>}
          <FormControl>
            {React.cloneElement(renderFieldContent() as React.ReactElement, {
              ...formField,
              "aria-required": field.required,
            })}
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// Section renderer component
interface SectionRendererProps {
  section: FormSection;
  form: UseFormReturn<any>;
  sectionIndex: number;
}

const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  form,
  sectionIndex,
}) => {
  return (
    <div className={cn("space-y-4", section.className)}>
      {section.title && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-4">
        {section.fields.map((field, fieldIndex) => (
          <FieldRenderer
            key={`section-${sectionIndex}-field-${fieldIndex}`}
            field={field}
            form={form}
            index={fieldIndex}
          />
        ))}
      </div>
    </div>
  );
};

// Main DynamicFormGenerator component
export interface DynamicFormGeneratorProps extends DynamicFormConfig {
  loading?: boolean;
}

export const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  sections,
  fields,
  schema,
  submitLabel = "Submit",
  resetLabel = "Reset",
  showReset = false,
  className,
  onSubmit,
  onReset,
  defaultValues = {},
  loading = false,
}) => {
  // Generate schema from field configurations if not provided
  const formSchema = React.useMemo(() => {
    if (schema) return schema;

    const schemaFields: Record<string, z.ZodTypeAny> = {};
    const allFields = sections
      ? sections.flatMap((section) => section.fields)
      : fields || [];

    // Define processField function before using it
    function processField(field: FieldConfig) {
      if (field.validation) {
        schemaFields[field.name] = field.validation;
      } else {
        // Auto-generate basic validation based on field type with custom required messages
        let fieldSchema: z.ZodTypeAny;
        const requiredMessage = `${field.name.toLowerCase()} is required`;

        switch (field.type) {
          case "email":
            fieldSchema = field.required
              ? z
                  .string({ required_error: requiredMessage })
                  .email("invalid email address")
              : z.string().email("invalid email address").optional();
            break;
          case "password":
            fieldSchema = field.required
              ? z
                  .string({ required_error: requiredMessage })
                  .min(8, "password must be at least 8 characters")
              : z
                  .string()
                  .min(8, "password must be at least 8 characters")
                  .optional();
            break;
          case "number":
            fieldSchema = field.required
              ? z.coerce.number({ required_error: requiredMessage })
              : z.coerce.number().optional();
            break;
          case "checkbox":
          case "switch":
            if (field.required) {
              fieldSchema = z
                .boolean({ required_error: requiredMessage })
                .refine((val) => val === true, {
                  message: requiredMessage,
                });
            } else {
              fieldSchema = z.boolean().optional();
            }
            break;
          case "multiselect":
            fieldSchema = field.required
              ? z
                  .array(z.string(), { required_error: requiredMessage })
                  .min(1, requiredMessage)
              : z.array(z.string()).optional();
            break;
          case "file":
            fieldSchema = field.required
              ? z.any().refine((val) => val !== undefined && val !== null, {
                  message: requiredMessage,
                })
              : z.any().optional();
            break;
          case "date":
          case "datetime":
            fieldSchema = field.required
              ? z.coerce.date({ required_error: requiredMessage })
              : z.coerce.date().optional();
            break;
          case "daterange":
            if (field.required) {
              fieldSchema = z.object(
                {
                  from: z.date({
                    required_error: `${field.name.toLowerCase()} start date is required`,
                  }),
                  to: z.date({
                    required_error: `${field.name.toLowerCase()} end date is required`,
                  }),
                },
                { required_error: requiredMessage }
              );
            } else {
              fieldSchema = z
                .object({
                  from: z.date(),
                  to: z.date(),
                })
                .optional();
            }
            break;
          default:
            // Default case for string-based fields (text, textarea, select, etc.)
            fieldSchema = field.required
              ? z
                  .string({ required_error: requiredMessage })
                  .min(1, requiredMessage)
              : z.string().optional();
            break;
        }

        schemaFields[field.name] = fieldSchema;
      }
    }

    // Process all fields using the defined function
    allFields.forEach(processField);

    return z.object(schemaFields);
  }, [sections, fields, schema]);

  // Initialize form
  const form = useForm<any>({
    resolver: zodResolver(formSchema as any),
    defaultValues,
  });

  const handleSubmit = async (
    data: FieldValues,
    event?: React.BaseSyntheticEvent
  ) => {
    if (onSubmit) {
      await onSubmit(data, event);
    }
  };

  const handleReset = () => {
    form.reset();
    if (onReset) {
      onReset();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-6", className)}
      >
        {sections ? (
          // Render sections
          sections.map((section, index) => (
            <SectionRenderer
              key={`section-${index}`}
              section={section}
              form={form}
              sectionIndex={index}
            />
          ))
        ) : (
          // Render flat fields
          <div className="grid gap-4">
            {fields?.map((field, index) => (
              <FieldRenderer
                key={`field-${index}`}
                field={field}
                form={form}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading} className="min-w-[120px]">
            {loading ? "Submitting..." : submitLabel}
          </Button>
          {showReset && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              {resetLabel}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

// Form builder utility functions
export const createTextField = (
  name: string,
  options: Partial<TextFieldConfig> = {}
): TextFieldConfig => ({
  type: "text",
  name,
  ...options,
});

export const createEmailField = (
  name: string,
  options: Partial<TextFieldConfig> = {}
): TextFieldConfig => ({
  type: "email",
  name,
  validation: z.string().email("Invalid email address"),
  ...options,
});

export const createPasswordField = (
  name: string,
  options: Partial<TextFieldConfig> = {}
): TextFieldConfig => ({
  type: "password",
  name,
  validation: z.string().min(8, "Password must be at least 8 characters"),
  ...options,
});

export const createSelectField = (
  name: string,
  options: SelectOption[],
  config: Partial<SelectFieldConfig> = {}
): SelectFieldConfig => ({
  type: "select",
  name,
  options,
  ...config,
});

export const createCheckboxField = (
  name: string,
  checkboxLabel: string,
  options: Partial<CheckboxFieldConfig> = {}
): CheckboxFieldConfig => ({
  type: "checkbox",
  name,
  checkboxLabel,
  validation: z.boolean(),
  ...options,
});

export const createFileField = (
  name: string,
  options: Partial<FileFieldConfig> = {}
): FileFieldConfig => ({
  type: "file",
  name,
  ...options,
});

export const createDateField = (
  name: string,
  options: Partial<DateFieldConfig> = {}
): DateFieldConfig => ({
  type: "date",
  name,
  validation: z.date(),
  ...options,
});

// Export default for convenience
export default DynamicFormGenerator;
