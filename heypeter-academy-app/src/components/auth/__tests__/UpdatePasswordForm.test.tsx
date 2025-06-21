import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdatePasswordForm from "../UpdatePasswordForm";
import { resetPasswordUpdate } from "@/lib/actions/auth";

// Mock next/navigation router
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock toast hook
const toastMock = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

// Mock action
jest.mock("@/lib/actions/auth");
const mockedResetPasswordUpdate = resetPasswordUpdate as jest.MockedFunction<
  typeof resetPasswordUpdate
>;

describe("UpdatePasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields", () => {
    render(<UpdatePasswordForm />);

    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Update Password/i })
    ).toBeInTheDocument();
  });

  it("submits valid data and shows success toast", async () => {
    mockedResetPasswordUpdate.mockResolvedValueOnce({
      data: { message: "Password updated successfully." },
    });

    render(<UpdatePasswordForm />);

    const newPasswordInput = screen.getByLabelText(/New Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
    const submitButton = screen.getByRole("button", {
      name: /Update Password/i,
    });

    await userEvent.type(newPasswordInput, "ComplexPass123!");
    await userEvent.type(confirmPasswordInput, "ComplexPass123!");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedResetPasswordUpdate).toHaveBeenCalledWith({
        newPassword: "ComplexPass123!",
        confirmPassword: "ComplexPass123!",
      });
      expect(toastMock).toHaveBeenCalledWith({
        title: "Success",
        description: "Password updated successfully.",
      });
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error toast on failure", async () => {
    mockedResetPasswordUpdate.mockResolvedValueOnce({
      error: { message: "Something went wrong." },
    });

    render(<UpdatePasswordForm />);

    await userEvent.type(
      screen.getByLabelText(/New Password/i),
      "ComplexPass123!"
    );
    await userEvent.type(
      screen.getByLabelText(/Confirm New Password/i),
      "ComplexPass123!"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Update Password/i })
    );

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
