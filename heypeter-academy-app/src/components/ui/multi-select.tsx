"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Badge } from "@/components/ui/badge";

const multiSelectVariants = cva(
  "m-0 flex content-center items-center justify-between gap-1.5 rounded-lg border-2 border-solid border-border bg-background p-2.5 text-base leading-4 text-foreground ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-border",
        secondary:
          "border-secondary-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive-border bg-destructive text-destructive-foreground",
        ghost: "border-transparent bg-transparent",
      },
      size: {
        sm: "h-9 text-sm",
        md: "h-10 text-base",
        lg: "h-11 text-lg",
        xl: "h-12 text-xl",
      },
      disabled: {
        true: "cursor-not-allowed opacity-50",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      disabled: false,
    },
  }
);

export interface MultiSelectOption {
  label: string;
  value: string;
  /** Fixed options are stuck at the top of the search results. */
  fixed?: boolean;
  /** Disabled options cannot be selected. */
  disabled?: boolean;
}

interface MultiSelectProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof multiSelectVariants> {
  /** The options to display. */
  options: MultiSelectOption[];
  /** The currently selected values. */
  value: string[];
  /** A function to call when the selected values change. */
  onValueChange: (value: string[]) => void;
  /** The maximum number of items to display. */
  maxDisplayedItems?: number;
  /** A message to display when the maximum number of items is reached. */
  maxDisplayedItemsMessage?: string;
  /** The placeholder to display when no items are selected. */
  placeholder?: string;
}

const MultiSelect = React.forwardRef<HTMLInputElement, MultiSelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      variant,
      size,
      disabled,
      maxDisplayedItems = 3,
      maxDisplayedItemsMessage = "and {remainingCount} more...",
      placeholder = "Select items...",
      className,
      ...props
    },
    ref
  ) => {
    const [isOpened, setIsOpened] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const selectedItems = React.useMemo(
      () => options.filter((option) => value.includes(option.value)),
      [options, value]
    );

    const displayedItems = React.useMemo(() => {
      if (selectedItems.length > maxDisplayedItems) {
        const remainingCount = selectedItems.length - maxDisplayedItems;
        return selectedItems.slice(0, maxDisplayedItems).map((item) => ({
          ...item,
          message:
            remainingCount > 0
              ? maxDisplayedItemsMessage.replace(
                  "{remainingCount}",
                  remainingCount.toString()
                )
              : "",
        }));
      }
      return selectedItems;
    }, [selectedItems, maxDisplayedItems, maxDisplayedItemsMessage]);

    const handleSelect = React.useCallback(
      (selectedValue: string) => {
        if (value.includes(selectedValue)) {
          onValueChange(value.filter((v) => v !== selectedValue));
        } else {
          onValueChange([...value, selectedValue]);
        }
      },
      [value, onValueChange]
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const input = e.currentTarget.querySelector("input");
        if (input) {
          if (e.key === "Delete" || e.key === "Backspace") {
            if (input.value === "" && value.length > 0) {
              const lastValue = value[value.length - 1];
              const lastOption = options.find(
                (option) => option.value === lastValue
              );
              if (lastOption && !lastOption.fixed) {
                handleSelect(lastValue);
              }
            }
          }
          if (e.key === "Escape") {
            input.blur();
          }
        }
      },
      [value, handleSelect, options]
    );

    return (
      <Command
        onKeyDown={handleKeyDown}
        className="h-auto overflow-visible bg-transparent"
      >
        <div
          className={cn(
            multiSelectVariants({ variant, size, disabled }),
            className
          )}
        >
          <div className="flex w-full flex-wrap items-center gap-1.5">
            {displayedItems.map((item) => (
              <Badge
                key={item.value}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                {item.label}
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => handleSelect(item.value)}
                  disabled={item.fixed}
                  className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedItems.length > maxDisplayedItems && (
              <span className="text-sm text-muted-foreground">
                {maxDisplayedItemsMessage.replace(
                  "{remainingCount}",
                  (selectedItems.length - maxDisplayedItems).toString()
                )}
              </span>
            )}
            {selectedItems.length === 0 && (
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
            )}
          </div>
          <CommandPrimitive.Input
            ref={ref}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setIsOpened(false)}
            onFocus={() => setIsOpened(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            {...props}
          />
        </div>
        {isOpened && (
          <div className="relative mt-2">
            <CommandList className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "cursor-pointer",
                      value.includes(option.value) && "font-bold"
                    )}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
