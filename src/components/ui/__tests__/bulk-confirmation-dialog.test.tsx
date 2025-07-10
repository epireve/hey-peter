import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { BulkConfirmationDialog, useBulkConfirmation } from "../bulk-confirmation-dialog";

describe("BulkConfirmationDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockItems = [
    {
      id: "1",
      displayName: "Item 1",
    },
    {
      id: "2",
      displayName: "Item 2",
      warning: "This item has a warning",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <BulkConfirmationDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it("should render delete confirmation dialog with correct content", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    expect(screen.getByText("Delete Items")).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByText("2 items selected")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show warnings badge when items have warnings", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("This item has a warning")).toBeInTheDocument();
  });

  it("should show destructive warning for delete action", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    // The text appears in both the description and the warning section
    expect(screen.getAllByText(/this action cannot be undone/i)).toHaveLength(2);
  });

  it("should handle export action correctly", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="export"
        items={mockItems}
      />
    );

    expect(screen.getByText("Export Items")).toBeInTheDocument();
    expect(screen.getByText(/export the selected items/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    
    // Should not show destructive warning for export
    expect(screen.queryByText(/this action cannot be undone/i)).not.toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    const confirmButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when cancel button is clicked", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should disable buttons when loading", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={mockItems}
        loading={true}
      />
    );

    const confirmButton = screen.getByRole("button", { name: /processing/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should show custom title and description when provided", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="custom"
        items={mockItems}
        title="Custom Title"
        description="Custom description"
        actionLabel="Custom Action"
      />
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /custom action/i })).toBeInTheDocument();
  });

  it("should limit displayed items and show remaining count", () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      displayName: `Item ${i + 1}`,
    }));

    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={manyItems}
        maxItemsToShow={10}
      />
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 10")).toBeInTheDocument();
    expect(screen.queryByText("Item 11")).not.toBeInTheDocument();
    expect(screen.getByText("... and 5 more items")).toBeInTheDocument();
  });

  it("should handle singular item count correctly", () => {
    const singleItem = [mockItems[0]];

    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="delete"
        items={singleItem}
      />
    );

    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("should apply custom destructive setting", () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        action="export"
        items={mockItems}
        destructive={true}
      />
    );

    // Should show destructive warning even for export when explicitly set
    // The warning text only appears in the warning section for export (not in description)
    expect(screen.getAllByText(/this action cannot be undone/i)).toHaveLength(1);
  });
});

describe("useBulkConfirmation", () => {
  it("should initialize with closed state", () => {
    const { result } = renderHook(() => useBulkConfirmation());

    expect(result.current.isOpen).toBe(false);
  });

  it("should open confirmation dialog when confirm is called", () => {
    const { result } = renderHook(() => useBulkConfirmation());
    const mockAction = jest.fn();

    act(() => {
      result.current.confirm(mockAction);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should execute action and close when handleConfirm is called", () => {
    const { result } = renderHook(() => useBulkConfirmation());
    const mockAction = jest.fn();

    act(() => {
      result.current.confirm(mockAction);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleConfirm();
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it("should close without executing action when handleCancel is called", () => {
    const { result } = renderHook(() => useBulkConfirmation());
    const mockAction = jest.fn();

    act(() => {
      result.current.confirm(mockAction);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleCancel();
    });

    expect(mockAction).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it("should handle multiple confirm calls correctly", () => {
    const { result } = renderHook(() => useBulkConfirmation());
    const firstAction = jest.fn();
    const secondAction = jest.fn();

    act(() => {
      result.current.confirm(firstAction);
    });

    act(() => {
      result.current.confirm(secondAction);
    });

    // Should execute the latest action
    act(() => {
      result.current.handleConfirm();
    });

    expect(firstAction).not.toHaveBeenCalled();
    expect(secondAction).toHaveBeenCalledTimes(1);
  });
});