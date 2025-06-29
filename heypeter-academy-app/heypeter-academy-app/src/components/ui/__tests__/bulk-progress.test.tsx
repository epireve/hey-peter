import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { BulkProgressDialog, useBulkProgress } from "../bulk-progress";

describe("BulkProgressDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProgress = {
    total: 10,
    completed: 5,
    failed: 1,
    status: "running" as const,
    currentItem: "Processing item 5",
    errors: ["Error with item 3"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <BulkProgressDialog
        isOpen={false}
        onClose={mockOnClose}
        progress={defaultProgress}
        operation="Test Operation"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render progress dialog with correct information", () => {
    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={defaultProgress}
        operation="Test Operation"
      />
    );

    expect(screen.getByText("Test Operation")).toBeInTheDocument();
    expect(screen.getByText("Processing items...")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("5 of 10 processed • Processing item 5")).toBeInTheDocument();
  });

  it("should show completion state when operation is completed", () => {
    const completedProgress = {
      ...defaultProgress,
      status: "completed" as const,
      completed: 10,
      failed: 2,
      currentItem: undefined,
    };

    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={completedProgress}
        operation="Test Operation"
      />
    );

    expect(screen.getByText("Operation completed")).toBeInTheDocument();
    expect(screen.getByText("8 successful, 2 failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("should show error state when operation fails", () => {
    const errorProgress = {
      ...defaultProgress,
      status: "error" as const,
    };

    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={errorProgress}
        operation="Test Operation"
      />
    );

    // Use getAllByText since "Operation failed" appears in both description and status
    expect(screen.getAllByText("Operation failed")).toHaveLength(2);
  });

  it("should display error messages when present", () => {
    const progressWithErrors = {
      ...defaultProgress,
      errors: ["Error 1", "Error 2"],
    };

    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={progressWithErrors}
        operation="Test Operation"
      />
    );

    expect(screen.getByText("Errors:")).toBeInTheDocument();
    expect(screen.getByText("Error 1")).toBeInTheDocument();
    expect(screen.getByText("Error 2")).toBeInTheDocument();
  });

  it("should show cancel button when operation is running and onCancel is provided", () => {
    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={defaultProgress}
        operation="Test Operation"
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when close button is clicked", () => {
    const completedProgress = {
      ...defaultProgress,
      status: "completed" as const,
    };

    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={completedProgress}
        operation="Test Operation"
      />
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should not show close button in header when operation is running", () => {
    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={defaultProgress}
        operation="Test Operation"
      />
    );

    // Should not have close button in header during running state
    const headerCloseButtons = screen.queryAllByRole("button", { name: /close/i });
    expect(headerCloseButtons).toHaveLength(0);
  });

  it("should show success/failed counts when items are completed", () => {
    const progressWithCounts = {
      ...defaultProgress,
      completed: 8,
      failed: 2,
    };

    render(
      <BulkProgressDialog
        isOpen={true}
        onClose={mockOnClose}
        progress={progressWithCounts}
        operation="Test Operation"
      />
    );

    expect(screen.getByText("Success: 6")).toBeInTheDocument();
    expect(screen.getByText("Failed: 2")).toBeInTheDocument();
  });
});

describe("useBulkProgress", () => {
  it("should initialize with idle state", () => {
    const { result } = renderHook(() => useBulkProgress());

    expect(result.current.progress).toEqual({
      total: 0,
      completed: 0,
      failed: 0,
      status: "idle",
      errors: [],
    });
  });

  it("should start operation correctly", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
    });

    expect(result.current.progress).toEqual({
      total: 10,
      completed: 0,
      failed: 0,
      status: "running",
      errors: [],
    });
  });

  it("should update progress correctly", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
    });

    act(() => {
      result.current.updateProgress(5, 1, "Processing item 5");
    });

    expect(result.current.progress).toEqual({
      total: 10,
      completed: 5,
      failed: 1,
      status: "running",
      currentItem: "Processing item 5",
      errors: [],
    });
  });

  it("should add errors correctly", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
    });

    act(() => {
      result.current.addError("First error");
      result.current.addError("Second error");
    });

    expect(result.current.progress.errors).toEqual(["First error", "Second error"]);
  });

  it("should complete operation with success status when no failures", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
      result.current.updateProgress(10, 0);
    });

    act(() => {
      result.current.completeOperation();
    });

    expect(result.current.progress.status).toBe("completed");
    expect(result.current.progress.currentItem).toBeUndefined();
  });

  it("should complete operation with error status when failures exist", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
      result.current.updateProgress(10, 2);
    });

    act(() => {
      result.current.completeOperation();
    });

    expect(result.current.progress.status).toBe("error");
  });

  it("should reset progress correctly", () => {
    const { result } = renderHook(() => useBulkProgress());

    act(() => {
      result.current.startOperation(10);
      result.current.updateProgress(5, 1, "Processing");
      result.current.addError("Test error");
    });

    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress).toEqual({
      total: 0,
      completed: 0,
      failed: 0,
      status: "idle",
      errors: [],
    });
  });
});