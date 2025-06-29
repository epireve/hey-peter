"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: Omit<
    React.ComponentProps<typeof DayPicker>,
    "mode" | "selected" | "onSelect"
  >;
  formatStr?: string;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      date,
      onDateChange,
      placeholder = "Pick a date",
      disabled = false,
      className,
      calendarProps,
      formatStr = "PPP",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleDateSelect = (selectedDate: Date | undefined) => {
      onDateChange?.(selectedDate);
      setIsOpen(false);
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, formatStr) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={disabled}
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DatePicker.displayName = "DatePicker";

export interface DateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: Omit<
    React.ComponentProps<typeof DayPicker>,
    "mode" | "selected" | "onSelect"
  >;
  formatStr?: string;
}

const DateRangePicker = React.forwardRef<
  HTMLButtonElement,
  DateRangePickerProps
>(
  (
    {
      dateRange,
      onDateRangeChange,
      placeholder = "Pick a date range",
      disabled = false,
      className,
      calendarProps,
      formatStr = "LLL dd, y",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleRangeSelect = (range: DateRange | undefined) => {
      onDateRangeChange?.(range);
      if (range?.from && range?.to) {
        setIsOpen(false);
      }
    };

    const formatDateRange = () => {
      if (!dateRange?.from) {
        return placeholder;
      }

      if (dateRange.to) {
        return `${format(dateRange.from, formatStr)} - ${format(
          dateRange.to,
          formatStr
        )}`;
      }

      return format(dateRange.from, formatStr);
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange?.from && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{formatDateRange()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={handleRangeSelect}
            disabled={disabled}
            numberOfMonths={2}
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DateRangePicker.displayName = "DateRangePicker";

export interface DateTimePickerProps
  extends Omit<DatePickerProps, "formatStr"> {
  time?: string;
  onTimeChange?: (time: string) => void;
  timeStep?: number;
  show12Hour?: boolean;
}

const DateTimePicker = React.forwardRef<HTMLDivElement, DateTimePickerProps>(
  (
    {
      date,
      onDateChange,
      time = "12:00",
      onTimeChange,
      placeholder = "Pick date and time",
      disabled = false,
      className,
      calendarProps,
      timeStep = 15,
      show12Hour = false,
    },
    ref
  ) => {
    const [isDateOpen, setIsDateOpen] = React.useState(false);

    const handleDateSelect = (selectedDate: Date | undefined) => {
      onDateChange?.(selectedDate);
      setIsDateOpen(false);
    };

    const handleTimeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      onTimeChange?.(event.target.value);
    };

    const generateTimeOptions = () => {
      const options = [];
      const totalMinutes = 24 * 60;

      for (let i = 0; i < totalMinutes; i += timeStep) {
        const hours = Math.floor(i / 60);
        const minutes = i % 60;

        let timeString;
        if (show12Hour) {
          const period = hours >= 12 ? "PM" : "AM";
          const displayHours =
            hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          timeString = `${displayHours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")} ${period}`;
        } else {
          timeString = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
        }

        options.push(timeString);
      }

      return options;
    };

    const formatDateTime = () => {
      if (!date) {
        return placeholder;
      }

      const dateStr = format(date, "PPP");
      return `${dateStr} at ${time}`;
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>{formatDateTime()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={disabled}
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>

        <select
          value={time}
          onChange={handleTimeChange}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {generateTimeOptions().map((timeOption) => (
            <option key={timeOption} value={timeOption}>
              {timeOption}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

DateTimePicker.displayName = "DateTimePicker";

export { DatePicker, DateRangePicker, DateTimePicker };
