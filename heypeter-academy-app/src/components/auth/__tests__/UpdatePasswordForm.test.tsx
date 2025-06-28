import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UpdatePasswordForm from "../UpdatePasswordForm";
import { toast } from "sonner";
import { resetPasswordUpdate } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

jest.mock("sonner");
jest.mock("@/lib/actions/auth");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockToast = toast as jest.MockedFunction<typeof toast> & {
  success: jest.Mock;
  error: jest.Mock;
};
const mockResetPasswordUpdate = resetPasswordUpdate as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe("UpdatePasswordForm", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
    jest.clearAllMocks();
  });

  it("should render the form with all fields", () => {
    render(<UpdatePasswordForm />);
    expect(screen.getByLabelText(/New Password\*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  it("should display an error if passwords do not match", async () => {
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText(/New Password\*/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "password456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it("should show loading state when submitting", async () => {
    mockResetPasswordUpdate.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { message: "Success" } }), 100))
    );
    
    render(<UpdatePasswordForm />);
    fireEvent.change(screen.getByLabelText(/New Password\*/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "password123" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    // Check that the button shows loading state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /updating.../i })).toBeInTheDocument();
    });
  });

  it("should call resetPasswordUpdate on successful submission and redirect", async () => {
    mockResetPasswordUpdate.mockResolvedValue({
      data: { message: "Password updated successfully" },
    });
    render(<UpdatePasswordForm />);

    fireEvent.change(screen.getByLabelText(/New Password\*/i), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockResetPasswordUpdate).toHaveBeenCalledWith({
        newPassword: "newPassword123",
        confirmPassword: "newPassword123",
      });
      expect(mockToast.success).toHaveBeenCalledWith("Password updated successfully");
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("should display an error toast if submission fails", async () => {
    const errorMessage = "Failed to update password";
    mockResetPasswordUpdate.mockResolvedValue({
      error: { message: errorMessage },
    });
    render(<UpdatePasswordForm />);

    fireEvent.change(screen.getByLabelText(/New Password\*/i), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockResetPasswordUpdate).toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });
  });
});
