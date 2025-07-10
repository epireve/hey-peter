"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min, max, step = 1, value, onValueChange, id, ...props }, ref) => (
    <input
      ref={ref}
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] || 0}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={cn(
        "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider",
        className
      )}
      {...props}
    />
  )
)
Slider.displayName = "Slider"

export { Slider }