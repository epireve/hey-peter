"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Download, Upload, Edit, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface BulkConfirmationItem {
  id: string | number;
  displayName: string;
  warning?: string;
}

export interface BulkConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: "delete" | "export" | "import" | "edit" | "custom";
  actionLabel?: string;
  title?: string;
  description?: string;
  items: BulkConfirmationItem[];
  loading?: boolean;
  destructive?: boolean;
  maxItemsToShow?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

const actionConfig = {
  delete: {
    icon: Trash2,
    title: "Delete Items",
    description: "Are you sure you want to delete the selected items? This action cannot be undone.",
    actionLabel: "Delete",
    destructive: true,
  },
  export: {
    icon: Download,
    title: "Export Items",
    description: "Export the selected items to a file.",
    actionLabel: "Export",
    destructive: false,
  },
  import: {
    icon: Upload,
    title: "Import Items",
    description: "Import the selected items from a file.",
    actionLabel: "Import",
    destructive: false,
  },
  edit: {
    icon: Edit,
    title: "Edit Items",
    description: "Apply bulk changes to the selected items.",
    actionLabel: "Apply Changes",
    destructive: false,
  },
  custom: {
    icon: Info,
    title: "Bulk Action",
    description: "Perform the selected action on the chosen items.",
    actionLabel: "Continue",
    destructive: false,
  },
};

export function BulkConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  actionLabel,
  title,
  description,
  items,
  loading = false,
  destructive,
  maxItemsToShow = 10,
  icon: CustomIcon,
}: BulkConfirmationDialogProps) {
  const config = actionConfig[action];
  const Icon = CustomIcon || config.icon;
  const isDestructive = destructive ?? config.destructive;
  
  const displayItems = items.slice(0, maxItemsToShow);
  const remainingCount = items.length - displayItems.length;
  const hasWarnings = items.some(item => item.warning);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn(
              "h-5 w-5",
              isDestructive && "text-destructive"
            )} />
            {title || config.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description || config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Item count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {items.length} item{items.length !== 1 ? 's' : ''} selected
            </Badge>
            {hasWarnings && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Warnings
              </Badge>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected items:</h4>
              <ScrollArea className="max-h-32 w-full">
                <div className="space-y-1">
                  {displayItems.map((item) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.displayName}</span>
                        {item.warning && (
                          <AlertTriangle className="ml-2 h-3 w-3 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                      {item.warning && (
                        <div className="text-xs text-amber-600 mt-1">
                          {item.warning}
                        </div>
                      )}
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="text-xs text-muted-foreground italic">
                      ... and {remainingCount} more item{remainingCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Additional warnings for destructive actions */}
          {isDestructive && (
            <div className="rounded-md border-l-4 border-destructive bg-destructive/10 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  This action cannot be undone. All selected items will be permanently removed.
                </p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              isDestructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {loading ? "Processing..." : (actionLabel || config.actionLabel)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for managing bulk confirmation state
export function useBulkConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

  const confirm = React.useCallback((action: () => void) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const handleConfirm = React.useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setIsOpen(false);
  }, [pendingAction]);

  const handleCancel = React.useCallback(() => {
    setPendingAction(null);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    confirm,
    handleConfirm,
    handleCancel,
  };
}