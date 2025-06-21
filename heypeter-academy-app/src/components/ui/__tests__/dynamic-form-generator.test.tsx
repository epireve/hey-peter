import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import DynamicFormGenerator from "../dynamic-form-generator";
import type {
  FieldConfig,
  FormSection,
  TextFieldConfig,
  SelectFieldConfig,
  CheckboxFieldConfig,
  FileFieldConfig,
  DateFieldConfig,
} from "../dynamic-form-generator";

// Mock file API for file upload tests
global.File = class File {
  constructor(
    public fileBits: BlobPart[],
    public fileName: string,
    public options?: FilePropertyBag
  ) {}
  get name() {
    return this.fileName;
  }
  get size() {
    return 1024;
  }
  get type() {
    return "text/plain";
  }
} as any;

describe("DynamicFormGenerator", () => {
  const user = userEvent.setup();

  describe("Basic Form Rendering", () => {
    it("should render form with simple text fields", () => {
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "firstName",
          label: "First Name",
          placeholder: "Enter your first name",
          required: true,
        },
        {
          type: "email",
          name: "email",
          label: "Email Address",
          placeholder: "Enter your email",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });

    it("should render form with sections", () => {
      const sections: FormSection[] = [
        {
          title: "Personal Information",
          description: "Please provide your personal details",
          fields: [
            {
              type: "text",
              name: "firstName",
              label: "First Name",
              required: true,
            },
            {
              type: "text",
              name: "lastName",
              label: "Last Name",
              required: true,
            },
          ],
        },
        {
          title: "Contact Information",
          fields: [
            {
              type: "email",
              name: "email",
              label: "Email",
              required: true,
            },
          ],
        },
      ];

      render(
        <DynamicFormGenerator
          sections={sections}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      expect(screen.getByText("Personal Information")).toBeInTheDocument();
      expect(
        screen.getByText("Please provide your personal details")
      ).toBeInTheDocument();
      expect(screen.getByText("Contact Information")).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  describe("Field Type Testing", () => {
    it("should render and handle text field input", async () => {
      const onSubmit = jest.fn();
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "username",
          label: "Username",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const input = screen.getByLabelText(/username/i);
      await user.type(input, "testuser");

      expect(input).toHaveValue("testuser");
    });

    it("should render and handle email field with validation", async () => {
      const onSubmit = jest.fn();
      const fields: TextFieldConfig[] = [
        {
          type: "email",
          name: "email",
          label: "Email",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const input = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Test invalid email
      await user.type(input, "invalid-email");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });

      // Test valid email
      await user.clear(input);
      await user.type(input, "test@example.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          { email: "test@example.com" },
          expect.any(Object)
        );
      });
    });

    it("should render and handle select field", async () => {
      const onSubmit = jest.fn();
      const fields: SelectFieldConfig[] = [
        {
          type: "select",
          name: "country",
          label: "Country",
          placeholder: "Select a country",
          options: [
            { value: "us", label: "United States" },
            { value: "ca", label: "Canada" },
            { value: "my", label: "Malaysia" },
          ],
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const selectTrigger = screen.getByRole("combobox");
      await user.click(selectTrigger);

      const option = screen.getByText("Malaysia");
      await user.click(option);

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          { country: "my" },
          expect.any(Object)
        );
      });
    });

    it("should render and handle checkbox field", async () => {
      const onSubmit = jest.fn();
      const fields: CheckboxFieldConfig[] = [
        {
          type: "checkbox",
          name: "terms",
          label: "Terms and Conditions",
          checkboxLabel: "I agree to the terms and conditions",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          { terms: true },
          expect.any(Object)
        );
      });
    });

    it("should render and handle textarea field", async () => {
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          type: "textarea",
          name: "comments",
          label: "Comments",
          placeholder: "Enter your comments",
          required: false,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const textarea = screen.getByLabelText(/comments/i);
      await user.type(textarea, "This is a test comment");

      expect(textarea).toHaveValue("This is a test comment");

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          { comments: "This is a test comment" },
          expect.any(Object)
        );
      });
    });

    it("should render and handle number field", async () => {
      const onSubmit = jest.fn();
      const fields: FieldConfig[] = [
        {
          type: "number",
          name: "age",
          label: "Age",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const input = screen.getByLabelText(/age/i);
      await user.type(input, "25");

      expect(input).toHaveValue(25);

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ age: 25 }, expect.any(Object));
      });
    });

    it("should render and handle file field", async () => {
      const onSubmit = jest.fn();
      const fields: FileFieldConfig[] = [
        {
          type: "file",
          name: "avatar",
          label: "Profile Picture",
          accept: "image/*",
          required: false,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const fileInput = screen.getByLabelText(/profile picture/i);
      const file = new File(["test"], "test.png", { type: "image/png" });

      await user.upload(fileInput, file);

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            avatar: expect.arrayContaining([
              expect.objectContaining({ name: "test.png" }),
            ]),
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe("Form Validation", () => {
    it("should show validation errors for required fields", async () => {
      const onSubmit = jest.fn();
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "name",
          label: "Name",
          required: true,
        },
        {
          type: "email",
          name: "email",
          label: "Email",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should validate custom schema when provided", async () => {
      const onSubmit = jest.fn();
      const customSchema = z
        .object({
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });

      const fields: TextFieldConfig[] = [
        {
          type: "password",
          name: "password",
          label: "Password",
        },
        {
          type: "password",
          name: "confirmPassword",
          label: "Confirm Password",
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          schema={customSchema}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Test short password
      await user.type(passwordInput, "123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });

      // Test mismatched passwords
      await user.clear(passwordInput);
      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password456");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      // Test valid passwords
      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          {
            password: "password123",
            confirmPassword: "password123",
          },
          expect.any(Object)
        );
      });
    });
  });

  describe("Form Actions", () => {
    it("should handle form submission with loading state", async () => {
      const onSubmit = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "name",
          label: "Name",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      await user.type(nameInput, "Test User");
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByText(/submit/i)).toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });

      expect(onSubmit).toHaveBeenCalledWith(
        { name: "Test User" },
        expect.any(Object)
      );
    });

    it("should handle form reset when showReset is true", async () => {
      const onSubmit = jest.fn();
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "name",
          label: "Name",
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
          showReset={true}
          resetLabel="Clear"
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const resetButton = screen.getByRole("button", { name: /clear/i });

      await user.type(nameInput, "Test User");
      expect(nameInput).toHaveValue("Test User");

      await user.click(resetButton);
      expect(nameInput).toHaveValue("");
    });

    it("should populate form with default values", () => {
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "name",
          label: "Name",
        },
        {
          type: "email",
          name: "email",
          label: "Email",
        },
      ];

      const defaultValues = {
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <DynamicFormGenerator
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue("John Doe");
      expect(screen.getByLabelText(/email/i)).toHaveValue("john@example.com");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels and descriptions", () => {
      const fields: FieldConfig[] = [
        {
          type: "text",
          name: "username",
          label: "Username",
          description: "Enter a unique username",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      const input = screen.getByLabelText(/username/i);
      expect(input).toHaveAttribute("aria-required", "true");
      expect(screen.getByText("Enter a unique username")).toBeInTheDocument();
    });

    it("should announce validation errors to screen readers", async () => {
      const fields: TextFieldConfig[] = [
        {
          type: "email",
          name: "email",
          label: "Email",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      const input = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      await user.type(input, "invalid-email");
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email address/i);
        expect(errorMessage).toBeInTheDocument();
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty fields array gracefully", () => {
      render(
        <DynamicFormGenerator
          fields={[]}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });

    it("should handle missing labels gracefully", () => {
      const fields: FieldConfig[] = [
        {
          type: "text",
          name: "unlabeled",
          // No label provided
        } as TextFieldConfig,
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={jest.fn()}
          submitLabel="Submit"
        />
      );

      // Should render without crashing
      expect(
        screen.getByRole("button", { name: /submit/i })
      ).toBeInTheDocument();
    });

    it("should handle onSubmit errors gracefully", async () => {
      const onSubmit = jest
        .fn()
        .mockRejectedValue(new Error("Submission failed"));
      const fields: TextFieldConfig[] = [
        {
          type: "text",
          name: "name",
          label: "Name",
          required: true,
        },
      ];

      render(
        <DynamicFormGenerator
          fields={fields}
          onSubmit={onSubmit}
          submitLabel="Submit"
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      await user.type(nameInput, "Test User");
      await user.click(submitButton);

      // Should handle error gracefully and not crash
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });
});
