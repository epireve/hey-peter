"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  Download, 
  Upload, 
  Edit, 
  MoreHorizontal,
  X,
  CheckSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive" | "outline" | "secondary";
  onClick: () => void;
  disabled?: boolean;
}

export interface BulkActionsToolbarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  className?: string;
  maxVisibleActions?: number;
}

export function BulkActionsToolbar({ 
  selectedCount, 
  actions, 
  onClearSelection,
  className,
  maxVisibleActions = 3
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const visibleActions = actions.slice(0, maxVisibleActions);
  const hiddenActions = actions.slice(maxVisibleActions);

  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border bg-muted/50 p-3 shadow-sm",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        <Separator orientation="vertical" className="h-4" />
        
        <div className="flex items-center gap-1">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className="h-8"
              >
                {Icon && <Icon className="mr-1 h-3 w-3" />}
                {action.label}
              </Button>
            );
          })}
          
          {hiddenActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hiddenActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        action.variant === "destructive" && "text-destructive focus:text-destructive"
                      )}
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Clear selection</span>
      </Button>
    </div>
  );
}

// Predefined common bulk actions
export const commonBulkActions = {
  delete: (onClick: () => void, disabled?: boolean): BulkAction => ({
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive" as const,
    onClick,
    disabled,
  }),
  
  export: (onClick: () => void, disabled?: boolean): BulkAction => ({
    id: "export",
    label: "Export",
    icon: Download,
    variant: "outline" as const,
    onClick,
    disabled,
  }),
  
  import: (onClick: () => void, disabled?: boolean): BulkAction => ({
    id: "import",
    label: "Import",
    icon: Upload,
    variant: "outline" as const,
    onClick,
    disabled,
  }),
  
  edit: (onClick: () => void, disabled?: boolean): BulkAction => ({
    id: "edit",
    label: "Edit",
    icon: Edit,
    variant: "outline" as const,
    onClick,
    disabled,
  }),
};