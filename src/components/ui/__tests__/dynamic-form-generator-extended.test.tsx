import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { 
  DynamicFormGenerator, 
  generateFormSchema,
  createTextField,
  createEmailField,
  createPasswordField,
  createSelectField,
  createCheckboxField,
  createDateField
} from "../dynamic-form-generator";

// Mock the UI components that aren't fully implemented
jest.mock("../date-picker", () => ({
  DatePicker: ({ placeholder, disabled }: any) => (
    <input 
      type="date" 
      placeholder={placeholder} 
      disabled={disabled}
      data-testid="date-picker"
    />
  ),
  DateRangePicker: ({ placeholder, disabled }: any) => (
    <div data-testid="date-range-picker">
      <input type="date" placeholder={placeholder} disabled={disabled} />
      <input type="date" placeholder={placeholder} disabled={disabled} />
    </div>
  ),
  DateTimePicker: ({ placeholder, disabled }: any) => (
    <input 
      type="datetime-local" 
      placeholder={placeholder} 
      disabled={disabled}
      data-testid="datetime-picker"
    />
  ),
}));

jest.mock("../file-upload", () => ({
  FileUpload: ({ accept, multiple, maxSize, maxFiles, disabled }: any) => (
    <input
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      data-testid="file-upload"
      data-max-size={maxSize}
      data-max-files={maxFiles}
    />
  ),
}));

jest.mock("../multi-select", () => ({
  MultiSelect: ({ options, value, onValueChange, placeholder, disabled }: any) => (
    <select
      multiple
      value={value}
      onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        onValueChange(selected);
      }}
      disabled={disabled}
      data-testid="multi-select"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

describe("DynamicFormGenerator Extended Tests", () => {
  const user = userEvent.setup();

  describe("Field Type Rendering", () => {
    it("renders date picker field", () => {
      const fields = [
        {
          type: "date" as const,
          name: "birthdate",
          label: "Birth Date",
          placeholder: "Select date",
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      const datePicker = screen.getByTestId("date-picker");
      expect(datePicker).toBeInTheDocument();
      expect(datePicker).toHaveAttribute("placeholder", "Select date");
    });

    it("renders datetime picker field", () => {
      const fields = [
        {
          type: "datetime" as const,
          name: "appointment",
          label: "Appointment Time",
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      const dateTimePicker = screen.getByTestId("datetime-picker");
      expect(dateTimePicker).toBeInTheDocument();
    });

    it("renders date range picker field", () => {
      const fields = [
        {
          type: "daterange" as const,
          name: "vacation",
          label: "Vacation Period",
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      const dateRangePicker = screen.getByTestId("date-range-picker");
      expect(dateRangePicker).toBeInTheDocument();
    });

    it("renders file upload field", () => {
      const fields = [
        {
          type: "file" as const,
          name: "resume",
          label: "Upload Resume",
          accept: ".pdf,.doc,.docx",
          maxSize: 5 * 1024 * 1024,
          maxFiles: 1,
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      const fileUpload = screen.getByTestId("file-upload");
      expect(fileUpload).toBeInTheDocument();
      expect(fileUpload).toHaveAttribute("accept", ".pdf,.doc,.docx");
      expect(fileUpload).toHaveAttribute("data-max-size", "5242880");
    });

    it("renders multi-select field", () => {
      const fields = [
        {
          type: "multiselect" as const,
          name: "skills",
          label: "Skills",
          options: [
            { label: "JavaScript", value: "js" },
            { label: "TypeScript", value: "ts" },
            { label: "React", value: "react" },
          ],
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      const multiSelect = screen.getByTestId("multi-select");
      expect(multiSelect).toBeInTheDocument();
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  describe("Schema Generation", () => {
    it("generates schema for date fields", () => {
      const fields = [
        {
          type: "date" as const,
          name: "birthdate",
          required: true,
        },
      ];

      const schema = generateFormSchema(fields);
      
      // Valid date
      expect(() => schema.parse({ birthdate: new Date() })).not.toThrow();
      
      // Missing required date
      expect(() => schema.parse({})).toThrow();
    });

    it("generates schema for multiselect fields", () => {
      const fields = [
        {
          type: "multiselect" as const,
          name: "skills",
          required: true,
        },
      ];

      const schema = generateFormSchema(fields);
      
      // Valid array
      expect(() => schema.parse({ skills: ["js", "ts"] })).not.toThrow();
      
      // Empty array should fail for required
      expect(() => schema.parse({ skills: [] })).toThrow();
    });

    it("generates schema for file fields", () => {
      const fields = [
        {
          type: "file" as const,
          name: "resume",
          required: true,
        },
      ];

      const schema = generateFormSchema(fields);
      
      // Valid file
      expect(() => schema.parse({ resume: new File([], "test.pdf") })).not.toThrow();
      
      // Missing required file
      expect(() => schema.parse({})).toThrow();
    });
  });

  describe("Utility Functions", () => {
    it("createTextField generates correct config", () => {
      const field = createTextField("username", {
        label: "Username",
        placeholder: "Enter username",
        required: true,
      });

      expect(field).toEqual({
        type: "text",
        name: "username",
        label: "Username",
        placeholder: "Enter username",
        required: true,
      });
    });

    it("createEmailField includes email validation", () => {
      const field = createEmailField("email", {
        label: "Email Address",
        required: true,
      });

      expect(field.type).toBe("email");
      expect(field.validation).toBeDefined();
      
      // Test the validation
      expect(() => field.validation?.parse("invalid")).toThrow();
      expect(() => field.validation?.parse("valid@email.com")).not.toThrow();
    });

    it("createPasswordField includes minimum length validation", () => {
      const field = createPasswordField("password", {
        label: "Password",
        required: true,
      });

      expect(field.type).toBe("password");
      expect(field.validation).toBeDefined();
      
      // Test the validation
      expect(() => field.validation?.parse("short")).toThrow();
      expect(() => field.validation?.parse("longenoughpassword")).not.toThrow();
    });

    it("createSelectField generates select config", () => {
      const options = [
        { label: "Option 1", value: "1" },
        { label: "Option 2", value: "2" },
      ];
      
      const field = createSelectField("choice", options, {
        label: "Make a choice",
        required: true,
      });

      expect(field).toEqual({
        type: "select",
        name: "choice",
        options,
        label: "Make a choice",
        required: true,
      });
    });

    it("createCheckboxField generates checkbox config", () => {
      const field = createCheckboxField("agree", "I agree to terms", {
        required: true,
      });

      expect(field).toEqual({
        type: "checkbox",
        name: "agree",
        checkboxLabel: "I agree to terms",
        validation: expect.any(Object),
        required: true,
      });
    });

    it("createDateField generates date config", () => {
      const field = createDateField("birthdate", {
        label: "Birth Date",
        required: true,
      });

      expect(field).toEqual({
        type: "date",
        name: "birthdate",
        label: "Birth Date",
        validation: expect.any(Object),
        required: true,
      });
    });
  });

  describe("Section Rendering", () => {
    it("renders sections with titles and descriptions", () => {
      const sections = [
        {
          title: "Personal Information",
          description: "Please provide your personal details",
          fields: [
            {
              type: "text" as const,
              name: "firstName",
              label: "First Name",
            },
            {
              type: "text" as const,
              name: "lastName",
              label: "Last Name",
            },
          ],
        },
        {
          title: "Contact Information",
          description: "How can we reach you?",
          fields: [
            {
              type: "email" as const,
              name: "email",
              label: "Email",
            },
          ],
        },
      ];

      render(<DynamicFormGenerator sections={sections} />);
      
      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(screen.getByText("Please provide your personal details")).toBeInTheDocument();
      expect(screen.getByText("Contact Information")).toBeInTheDocument();
      expect(screen.getByText("How can we reach you?")).toBeInTheDocument();
    });
  });

  describe("Form Submission with Complex Fields", () => {
    it("handles form submission with all field types", async () => {
      const mockSubmit = jest.fn();
      
      const fields = [
        {
          type: "text" as const,
          name: "name",
          label: "Name",
          required: true,
        },
        {
          type: "multiselect" as const,
          name: "skills",
          label: "Skills",
          options: [
            { label: "JavaScript", value: "js" },
            { label: "TypeScript", value: "ts" },
          ],
          required: true,
        },
        {
          type: "date" as const,
          name: "startDate",
          label: "Start Date",
          required: true,
        },
      ];

      const { container } = render(
        <DynamicFormGenerator 
          fields={fields} 
          onSubmit={mockSubmit}
        />
      );
      
      // Fill in the form
      const nameInput = screen.getByLabelText("Name");
      await user.type(nameInput, "John Doe");
      
      // Select multiple options
      const multiSelect = screen.getByTestId("multi-select");
      await user.selectOptions(multiSelect, ["js", "ts"]);
      
      // Set date
      const datePicker = screen.getByTestId("date-picker");
      fireEvent.change(datePicker, { target: { value: "2024-01-01" } });
      
      // Submit form
      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays validation errors for required fields", async () => {
      const fields = [
        {
          type: "text" as const,
          name: "name",
          label: "Name",
          required: true,
        },
        {
          type: "multiselect" as const,
          name: "skills",
          label: "Skills",
          required: true,
          options: [{ label: "JavaScript", value: "js" }],
        },
      ];

      render(<DynamicFormGenerator fields={fields} />);
      
      // Try to submit without filling required fields
      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/skills is required/i)).toBeInTheDocument();
      });
    });
  });
});