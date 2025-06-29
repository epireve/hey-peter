"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type TimeSlot = {
  start: string;
  end: string;
};

type DayAvailability = {
  enabled: boolean;
  slots: TimeSlot[];
};

type WeekAvailability = {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
};

interface AvailabilitySchedulerProps {
  value?: any;
  onChange?: (value: any) => void;
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function AvailabilityScheduler({
  value,
  onChange,
}: AvailabilitySchedulerProps) {
  const [availability, setAvailability] = React.useState<WeekAvailability>(() => {
    const defaultAvailability: WeekAvailability = {} as WeekAvailability;
    DAYS.forEach((day) => {
      defaultAvailability[day] = {
        enabled: false,
        slots: [{ start: "09:00", end: "17:00" }],
      };
    });
    return defaultAvailability;
  });

  React.useEffect(() => {
    if (value) {
      // Convert the value format to our internal format
      const newAvailability: WeekAvailability = {} as WeekAvailability;
      DAYS.forEach((day) => {
        if (value[day] && Array.isArray(value[day])) {
          newAvailability[day] = {
            enabled: value[day].length > 0,
            slots: value[day].length > 0 ? value[day] : [{ start: "09:00", end: "17:00" }],
          };
        } else {
          newAvailability[day] = {
            enabled: false,
            slots: [{ start: "09:00", end: "17:00" }],
          };
        }
      });
      setAvailability(newAvailability);
    }
  }, [value]);

  const handleDayToggle = (day: typeof DAYS[number]) => {
    const newAvailability = { ...availability };
    newAvailability[day].enabled = !newAvailability[day].enabled;
    setAvailability(newAvailability);
    updateValue(newAvailability);
  };

  const handleSlotChange = (
    day: typeof DAYS[number],
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    const newAvailability = { ...availability };
    newAvailability[day].slots[slotIndex][field] = value;
    setAvailability(newAvailability);
    updateValue(newAvailability);
  };

  const addSlot = (day: typeof DAYS[number]) => {
    const newAvailability = { ...availability };
    newAvailability[day].slots.push({ start: "09:00", end: "17:00" });
    setAvailability(newAvailability);
    updateValue(newAvailability);
  };

  const removeSlot = (day: typeof DAYS[number], slotIndex: number) => {
    const newAvailability = { ...availability };
    newAvailability[day].slots.splice(slotIndex, 1);
    setAvailability(newAvailability);
    updateValue(newAvailability);
  };

  const updateValue = (newAvailability: WeekAvailability) => {
    // Convert to the format expected by the form
    const formValue: any = {};
    DAYS.forEach((day) => {
      if (newAvailability[day].enabled) {
        formValue[day] = newAvailability[day].slots;
      } else {
        formValue[day] = [];
      }
    });
    onChange?.(formValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map((day) => (
          <div key={day} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{DAY_LABELS[day]}</Label>
              <Switch
                checked={availability[day].enabled}
                onCheckedChange={() => handleDayToggle(day)}
              />
            </div>
            {availability[day].enabled && (
              <div className="ml-6 space-y-2">
                {availability[day].slots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        handleSlotChange(day, index, "start", e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        handleSlotChange(day, index, "end", e.target.value)
                      }
                      className="w-32"
                    />
                    {availability[day].slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(day, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSlot(day)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Slot
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}