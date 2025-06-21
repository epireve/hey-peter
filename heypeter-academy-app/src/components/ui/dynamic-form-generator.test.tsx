/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DynamicFormGenerator,
  FieldConfig,
  generateFormSchema,
} from "./dynamic-form-generator";
import { Form } from "./form-field";

// Mock file reading for file upload tests
const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });

// Test wrapper component for form context
const TestFormWrapper: React.FC<{
  fields: FieldConfig[];
  onSubmit?: (data: any) => void;
  defaultValues?: Record<string, any>;
}> = ({ fields, onSubmit = jest.fn(), defaultValues = {} }) => {
  const schema = generateFormSchema(fields);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="test-form">
        <DynamicFormGenerator fields={fields} />
        <button type="submit" data-testid="submit-button">
          Submit
        </button>
      </form>
    </Form>
  );
};

describe("DynamicFormGenerator", () => {
  describe("Text Field Types", () => {
    it("should render text input field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "username",
          type: "text",
          label: "Username",
          placeholder: "Enter username",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("should render email input field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "email",
          type: "email",
          label: "Email Address",
          placeholder: "Enter email",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("should render password input field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "password",
          type: "password",
          label: "Password",
          placeholder: "Enter password",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute(
        "type",
        "password"
      );
    });

    it("should render number input field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "age",
          type: "number",
          label: "Age",
          placeholder: "Enter age",
          validation: { min: 0, max: 120 },
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("should render textarea field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "description",
          type: "textarea",
          label: "Description",
          placeholder: "Enter description",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe("Selection Field Types", () => {
    it("should render select field correctly", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "country",
          type: "select",
          label: "Country",
          options: [
            { label: "United States", value: "us" },
            { label: "Canada", value: "ca" },
            { label: "United Kingdom", value: "uk" },
          ],
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/country/i)).toBeInTheDocument();

      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("Canada")).toBeInTheDocument();
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    });

    it("should render multiselect field correctly", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "skills",
          type: "multiselect",
          label: "Skills",
          options: [
            { label: "JavaScript", value: "js" },
            { label: "TypeScript", value: "ts" },
            { label: "React", value: "react" },
          ],
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/skills/i)).toBeInTheDocument();

      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  describe("Boolean Field Types", () => {
    it("should render checkbox field correctly", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "terms",
          type: "checkbox",
          label: "Accept Terms and Conditions",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(
        screen.getByText(/accept terms and conditions/i)
      ).toBeInTheDocument();

      // Test checkbox interaction
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("should render radio field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "gender",
          type: "radio",
          label: "Gender",
          options: [
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ],
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/gender/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Male")).toBeInTheDocument();
      expect(screen.getByLabelText("Female")).toBeInTheDocument();
      expect(screen.getByLabelText("Other")).toBeInTheDocument();

      const radioButtons = screen.getAllByRole("radio");
      expect(radioButtons).toHaveLength(3);
    });

    it("should render switch field correctly", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "notifications",
          type: "switch",
          label: "Enable Notifications",
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(screen.getByText(/enable notifications/i)).toBeInTheDocument();

      // Test switch interaction
      expect(switchElement).not.toBeChecked();
      await user.click(switchElement);
      expect(switchElement).toBeChecked();
    });
  });

  describe("File Upload Field", () => {
    it("should render file upload field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "avatar",
          type: "file",
          label: "Profile Picture",
          fileOptions: {
            accept: "image/*",
            multiple: false,
            maxSize: 5 * 1024 * 1024, // 5MB
          },
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/profile picture/i)).toBeInTheDocument();
      expect(screen.getByText(/drag.*drop.*files/i)).toBeInTheDocument();
    });

    it("should handle file upload with validation", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          name: "document",
          type: "file",
          label: "Document",
          fileOptions: {
            accept: ".pdf,.doc,.docx",
            multiple: true,
            maxSize: 10 * 1024 * 1024, // 10MB
          },
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} onSubmit={onSubmit} />);

      const fileInput = screen.getByLabelText(/browse files/i);
      await user.upload(fileInput, mockFile);

      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });
  });

  describe("Date Field Types", () => {
    it("should render date picker field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "birthdate",
          type: "date",
          label: "Birth Date",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/birth date/i)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render date range picker field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "vacation",
          type: "daterange",
          label: "Vacation Dates",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/vacation dates/i)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render datetime picker field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "appointment",
          type: "datetime",
          label: "Appointment Time",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText(/appointment time/i)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Hidden Field", () => {
    it("should render hidden field correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "userId",
          type: "hidden",
          value: "12345",
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      const hiddenInput = document.querySelector('input[name="userId"]');
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput).toHaveAttribute("type", "hidden");
      expect(hiddenInput).toHaveAttribute("value", "12345");
    });
  });

  describe("Form Sections", () => {
    it("should render form sections correctly", () => {
      const fields: FieldConfig[] = [
        {
          name: "personalInfo",
          type: "section",
          label: "Personal Information",
          description: "Please provide your personal details",
          fields: [
            {
              name: "firstName",
              type: "text",
              label: "First Name",
              required: true,
            },
            {
              name: "lastName",
              type: "text",
              label: "Last Name",
              required: true,
            },
          ],
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(
        screen.getByText("Please provide your personal details")
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should validate required fields", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
          validation: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Please enter a valid email address",
          },
        },
      ];

      render(<TestFormWrapper fields={fields} onSubmit={onSubmit} />);

      const submitButton = screen.getByTestId("submit-button");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should validate email format", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByTestId("submit-button");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should validate number ranges", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          name: "age",
          type: "number",
          label: "Age",
          required: true,
          validation: { min: 18, max: 65 },
        },
      ];

      render(<TestFormWrapper fields={fields} onSubmit={onSubmit} />);

      const ageInput = screen.getByLabelText(/age/i);
      await user.type(ageInput, "16");

      const submitButton = screen.getByTestId("submit-button");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 18/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Form Schema Generation", () => {
    it("should generate correct schema for text fields", () => {
      const fields: FieldConfig[] = [
        {
          name: "username",
          type: "text",
          required: true,
          validation: { minLength: 3, maxLength: 20 },
        },
      ];

      const schema = generateFormSchema(fields);
      const result = schema.safeParse({ username: "ab" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 3");
      }
    });

    it("should generate correct schema for email fields", () => {
      const fields: FieldConfig[] = [
        {
          name: "email",
          type: "email",
          required: true,
        },
      ];

      const schema = generateFormSchema(fields);
      const result = schema.safeParse({ email: "invalid-email" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("email");
      }
    });

    it("should generate correct schema for number fields", () => {
      const fields: FieldConfig[] = [
        {
          name: "age",
          type: "number",
          required: true,
          validation: { min: 0, max: 120 },
        },
      ];

      const schema = generateFormSchema(fields);
      const result = schema.safeParse({ age: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 0");
      }
    });

    it("should generate correct schema for array fields", () => {
      const fields: FieldConfig[] = [
        {
          name: "skills",
          type: "multiselect",
          required: true,
          validation: { minItems: 1, maxItems: 5 },
        },
      ];

      const schema = generateFormSchema(fields);
      const result = schema.safeParse({ skills: [] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1");
      }
    });
  });

  describe("Form Submission", () => {
    it("should submit form with valid data", async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          name: "name",
          type: "text",
          label: "Name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByTestId("submit-button");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@example.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: "John Doe",
          email: "john@example.com",
        });
      });
    });

    it("should handle default values correctly", () => {
      const defaultValues = {
        name: "Jane Doe",
        email: "jane@example.com",
      };

      const fields: FieldConfig[] = [
        {
          name: "name",
          type: "text",
          label: "Name",
        },
        {
          name: "email",
          type: "email",
          label: "Email",
        },
      ];

      render(<TestFormWrapper fields={fields} defaultValues={defaultValues} />);

      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    });
  });

  describe("Field Conditional Display", () => {
    it("should show/hide fields based on conditions", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "hasAddress",
          type: "checkbox",
          label: "I have an address",
        },
        {
          name: "address",
          type: "textarea",
          label: "Address",
          conditional: {
            field: "hasAddress",
            operator: "equals",
            value: true,
          },
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      // Address field should not be visible initially
      expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();

      // Check the checkbox
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Address field should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels and descriptions", () => {
      const fields: FieldConfig[] = [
        {
          name: "username",
          type: "text",
          label: "Username",
          description: "Choose a unique username",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      const input = screen.getByLabelText(/username/i);
      expect(input).toHaveAttribute("aria-required", "true");
      expect(screen.getByText("Choose a unique username")).toBeInTheDocument();
    });

    it("should have proper error announcements", async () => {
      const user = userEvent.setup();
      const fields: FieldConfig[] = [
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
        },
      ];

      render(<TestFormWrapper fields={fields} />);

      const submitButton = screen.getByTestId("submit-button");
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/required/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute("role", "alert");
      });
    });
  });
});
