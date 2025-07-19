import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { SimpleDynamicForm, createTextField, createEmailField, createPasswordField, createSelectField, createCheckboxField } from "../dynamic-form-generator-simplified";
import type { FieldConfig } from "../dynamic-form-generator-simplified";

describe("SimpleDynamicForm", () => {
  const user = userEvent.setup();

  it("should render form with basic fields", () => {
    const fields: FieldConfig[] = [
      createTextField("firstName", "First Name", true),
      createEmailField("email", "Email"),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
        submitLabel="Submit"
      />
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("should handle form submission with valid data", async () => {
    const fields: FieldConfig[] = [
      createTextField("name", "Name", true),
      createEmailField("email", "Email"),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

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

  it("should show validation errors for required fields", async () => {
    const fields: FieldConfig[] = [
      createTextField("name", "Name", true),
      createEmailField("email", "Email", true),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should validate email format", async () => {
    const fields: FieldConfig[] = [
      createEmailField("email", "Email", true),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should handle select field", async () => {
    const fields: FieldConfig[] = [
      createSelectField("country", [
        { value: "us", label: "United States" },
        { value: "ca", label: "Canada" },
      ], "Country", true),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    const option = screen.getByText("Canada");
    await user.click(option);

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ country: "ca" });
    });
  });

  it("should handle checkbox field", async () => {
    const fields: FieldConfig[] = [
      createCheckboxField("terms", "I agree to terms", true),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ terms: true });
    });
  });

  it("should populate form with default values", () => {
    const fields: FieldConfig[] = [
      createTextField("name", "Name"),
      createEmailField("email", "Email"),
    ];

    const defaultValues = {
      name: "John Doe",
      email: "john@example.com",
    };

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={jest.fn()}
        defaultValues={defaultValues}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("John Doe");
    expect(screen.getByLabelText(/email/i)).toHaveValue("john@example.com");
  });

  it("should show loading state", () => {
    const fields: FieldConfig[] = [
      createTextField("name", "Name"),
    ];

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={jest.fn()}
        loading={true}
      />
    );

    const submitButton = screen.getByRole("button", { name: /submitting/i });
    expect(submitButton).toBeDisabled();
  });

  it("should handle custom validation", async () => {
    const fields: FieldConfig[] = [
      {
        name: "age",
        type: "number",
        label: "Age",
        required: true,
        validation: z.number().min(18, "Must be at least 18 years old"),
      },
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const ageInput = screen.getByLabelText(/age/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.type(ageInput, "16");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be at least 18 years old/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should handle textarea field", async () => {
    const fields: FieldConfig[] = [
      {
        name: "description",
        type: "textarea",
        label: "Description",
        placeholder: "Enter description",
      },
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const textarea = screen.getByLabelText(/description/i);
    await user.type(textarea, "This is a test description");

    expect(textarea).toHaveValue("This is a test description");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        description: "This is a test description",
      });
    });
  });

  it("should handle number field", async () => {
    const fields: FieldConfig[] = [
      {
        name: "price",
        type: "number",
        label: "Price",
        required: true,
      },
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByLabelText(/price/i);
    await user.type(input, "99.99");

    expect(input).toHaveValue(99.99);

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ price: 99.99 });
    });
  });

  it("should handle password field with validation", async () => {
    const fields: FieldConfig[] = [
      createPasswordField("password", "Password"),
    ];

    const onSubmit = jest.fn();

    render(
      <SimpleDynamicForm
        fields={fields}
        onSubmit={onSubmit}
      />
    );

    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    // Test short password
    await user.type(passwordInput, "123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    // Test valid password
    await user.clear(passwordInput);
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ password: "password123" });
    });
  });
});
