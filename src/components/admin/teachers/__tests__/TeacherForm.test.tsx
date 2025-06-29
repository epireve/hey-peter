import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeacherFormEnhanced } from "../TeacherFormEnhanced";
import { createTeacher } from "@/lib/actions/teacher";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/lib/actions/teacher");
jest.mock("sonner");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock the AvailabilityScheduler component
jest.mock("../AvailabilityScheduler", () => ({
  AvailabilityScheduler: ({ value, onChange }: any) => (
    <div data-testid="availability-scheduler">
      <button onClick={() => onChange({ monday: [{ start: "09:00", end: "17:00" }] })}>
        Set Availability
      </button>
    </div>
  ),
}));

describe("TeacherFormEnhanced", () => {
  const user = userEvent.setup();
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  it("renders all form sections", () => {
    render(<TeacherFormEnhanced />);

    // Check basic information section
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Coach Code")).toBeInTheDocument();

    // Check availability scheduler
    expect(screen.getByTestId("availability-scheduler")).toBeInTheDocument();

    // Check compensation section
    expect(screen.getByText("Compensation Details")).toBeInTheDocument();
    expect(screen.getByLabelText("Hourly Rate")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment Method")).toBeInTheDocument();
    expect(screen.getByLabelText("Bank Details")).toBeInTheDocument();

    // Check account settings
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    expect(screen.getByText("Send Credentials")).toBeInTheDocument();
    expect(screen.getByText("Activate Account")).toBeInTheDocument();
  });

  it("handles successful form submission", async () => {
    (createTeacher as jest.Mock).mockResolvedValue({
      data: { user: { id: "123" }, teacher: { id: "456" } },
    });

    render(<TeacherFormEnhanced />);

    // Fill in the form
    await user.type(screen.getByLabelText("Email Address"), "teacher@example.com");
    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Coach Code"), "F7");
    await user.type(screen.getByLabelText("Hourly Rate"), "50");

    // Set availability
    await user.click(screen.getByText("Set Availability"));

    // Submit form
    await user.click(screen.getByRole("button", { name: "Create Teacher" }));

    await waitFor(() => {
      expect(createTeacher).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "teacher@example.com",
          full_name: "John Doe",
          password: "password123",
          coach_code: "F7",
          compensation: expect.objectContaining({
            hourly_rate: 50,
          }),
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Teacher account created successfully");
    expect(toast.info).toHaveBeenCalledWith("Login credentials have been sent to teacher@example.com");
    expect(mockPush).toHaveBeenCalledWith("/admin/teachers");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("handles form submission errors", async () => {
    (createTeacher as jest.Mock).mockResolvedValue({
      error: "Email already exists",
    });

    render(<TeacherFormEnhanced />);

    // Fill in minimum required fields
    await user.type(screen.getByLabelText("Email Address"), "existing@example.com");
    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Coach Code"), "F7");
    await user.type(screen.getByLabelText("Hourly Rate"), "50");

    // Submit form
    await user.click(screen.getByRole("button", { name: "Create Teacher" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already exists");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("handles unexpected errors", async () => {
    (createTeacher as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<TeacherFormEnhanced />);

    // Fill in form
    await user.type(screen.getByLabelText("Email Address"), "teacher@example.com");
    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Coach Code"), "F7");
    await user.type(screen.getByLabelText("Hourly Rate"), "50");

    // Submit form
    await user.click(screen.getByRole("button", { name: "Create Teacher" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.");
    });
  });

  it("disables form during submission", async () => {
    let resolveSubmit: any;
    (createTeacher as jest.Mock).mockImplementation(
      () => new Promise((resolve) => { resolveSubmit = resolve; })
    );

    render(<TeacherFormEnhanced />);

    // Fill in form
    await user.type(screen.getByLabelText("Email Address"), "teacher@example.com");
    await user.type(screen.getByLabelText("Full Name"), "John Doe");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Coach Code"), "F7");
    await user.type(screen.getByLabelText("Hourly Rate"), "50");

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Create Teacher" });
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByRole("button", { name: /Creating/i })).toBeDisabled();

    // Resolve the promise
    resolveSubmit({ data: {} });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create Teacher" })).not.toBeDisabled();
    });
  });

  it("handles payment method selection", async () => {
    render(<TeacherFormEnhanced />);

    const paymentMethodTrigger = screen.getByRole("combobox");
    await user.click(paymentMethodTrigger);

    // Check all payment options are available
    expect(screen.getByRole("option", { name: "Bank Transfer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PayPal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cash" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Other" })).toBeInTheDocument();

    // Select PayPal
    await user.click(screen.getByRole("option", { name: "PayPal" }));
  });

  it("handles account settings toggles", async () => {
    render(<TeacherFormEnhanced />);

    const sendCredentialsSwitch = screen.getByRole("switch", { name: /Send Credentials/i });
    const activateAccountSwitch = screen.getByRole("switch", { name: /Activate Account/i });

    // Both should be checked by default
    expect(sendCredentialsSwitch).toBeChecked();
    expect(activateAccountSwitch).toBeChecked();

    // Toggle them
    await user.click(sendCredentialsSwitch);
    expect(sendCredentialsSwitch).not.toBeChecked();

    await user.click(activateAccountSwitch);
    expect(activateAccountSwitch).not.toBeChecked();
  });

  it("navigates back on cancel", async () => {
    render(<TeacherFormEnhanced />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith("/admin/teachers");
  });

  it("validates required fields", async () => {
    render(<TeacherFormEnhanced />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole("button", { name: "Create Teacher" });
    await user.click(submitButton);

    // The form should not submit
    expect(createTeacher).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    render(<TeacherFormEnhanced />);

    const emailInput = screen.getByLabelText("Email Address");
    await user.type(emailInput, "invalid-email");
    
    // Move focus away to trigger validation
    await user.tab();

    // Try to submit
    const submitButton = screen.getByRole("button", { name: "Create Teacher" });
    await user.click(submitButton);

    expect(createTeacher).not.toHaveBeenCalled();
  });

  it("validates password length", async () => {
    render(<TeacherFormEnhanced />);

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, "short");
    
    // Move focus away to trigger validation
    await user.tab();

    // Try to submit
    const submitButton = screen.getByRole("button", { name: "Create Teacher" });
    await user.click(submitButton);

    expect(createTeacher).not.toHaveBeenCalled();
  });
});