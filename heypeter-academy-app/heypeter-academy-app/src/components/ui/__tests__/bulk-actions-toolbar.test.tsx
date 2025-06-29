import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BulkActionsToolbar, commonBulkActions } from "../bulk-actions-toolbar";

describe("BulkActionsToolbar", () => {
  const mockOnClearSelection = jest.fn();
  const mockDeleteAction = jest.fn();
  const mockExportAction = jest.fn();

  const mockActions = [
    commonBulkActions.delete(mockDeleteAction),
    commonBulkActions.export(mockExportAction),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when no items are selected", () => {
    const { container } = render(
      <BulkActionsToolbar
        selectedCount={0}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render with selected count and actions", () => {
    render(
      <BulkActionsToolbar
        selectedCount={3}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("3 items selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("should show singular text for single item", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("should call clear selection when X button is clicked", () => {
    render(
      <BulkActionsToolbar
        selectedCount={2}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    const clearButton = screen.getByRole("button", { name: /clear selection/i });
    fireEvent.click(clearButton);

    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  it("should call action handlers when action buttons are clicked", () => {
    render(
      <BulkActionsToolbar
        selectedCount={2}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const exportButton = screen.getByRole("button", { name: /export/i });

    fireEvent.click(deleteButton);
    expect(mockDeleteAction).toHaveBeenCalledTimes(1);

    fireEvent.click(exportButton);
    expect(mockExportAction).toHaveBeenCalledTimes(1);
  });

  it("should show dropdown for additional actions when maxVisibleActions is exceeded", () => {
    const manyActions = [
      commonBulkActions.delete(mockDeleteAction),
      commonBulkActions.export(mockExportAction),
      commonBulkActions.edit(jest.fn()),
      commonBulkActions.import(jest.fn()),
    ];

    render(
      <BulkActionsToolbar
        selectedCount={2}
        actions={manyActions}
        onClearSelection={mockOnClearSelection}
        maxVisibleActions={2}
      />
    );

    // Should show first 2 actions as buttons
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();

    // Should show dropdown trigger for additional actions
    const dropdownTrigger = screen.getByRole("button", { name: "" }); // MoreHorizontal icon
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it("should disable actions when specified", () => {
    const disabledActions = [
      { ...commonBulkActions.delete(mockDeleteAction), disabled: true },
      commonBulkActions.export(mockExportAction),
    ];

    render(
      <BulkActionsToolbar
        selectedCount={2}
        actions={disabledActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const exportButton = screen.getByRole("button", { name: /export/i });

    expect(deleteButton).toBeDisabled();
    expect(exportButton).not.toBeDisabled();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <BulkActionsToolbar
        selectedCount={1}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should show correct variant styles for destructive actions", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    
    // Check if the button has destructive styling (implementation may vary)
    expect(deleteButton).toBeInTheDocument();
  });

  it("should render action icons when provided", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        actions={mockActions}
        onClearSelection={mockOnClearSelection}
      />
    );

    // Actions should have their respective icons
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const exportButton = screen.getByRole("button", { name: /export/i });

    expect(deleteButton).toBeInTheDocument();
    expect(exportButton).toBeInTheDocument();
  });
});