"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  courses: string[];
  teachers: string[];
  students: string[];
  metrics: string[];
}

interface AnalyticsFilterProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const COURSE_OPTIONS = [
  { value: "basic", label: "Basic English" },
  { value: "everyday", label: "Everyday A/B" },
  { value: "speakup", label: "Speak Up" },
  { value: "business", label: "Business English" },
  { value: "oneone", label: "1-on-1" },
];

const TEACHER_OPTIONS = [
  { value: "sarah", label: "Sarah Johnson" },
  { value: "michael", label: "Michael Chen" },
  { value: "emma", label: "Emma Davis" },
  { value: "david", label: "David Wilson" },
  { value: "lisa", label: "Lisa Rodriguez" },
];

const METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "students", label: "Students" },
  { value: "completion", label: "Completion Rate" },
  { value: "attendance", label: "Attendance" },
  { value: "retention", label: "Retention" },
];

export function AnalyticsFilter({ onFilterChange, className }: AnalyticsFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    courses: [],
    teachers: [],
    students: [],
    metrics: [],
  });

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleArrayFilterChange = (key: keyof FilterState, value: string, checked: boolean) => {
    const currentArray = filters[key] as string[];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleFilterChange(key, newArray);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      dateRange: { from: undefined, to: undefined },
      courses: [],
      teachers: [],
      students: [],
      metrics: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    count += filters.courses.length;
    count += filters.teachers.length;
    count += filters.students.length;
    count += filters.metrics.length;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("relative", className)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      format(filters.dateRange.from, "PPP")
                    ) : (
                      <span>From date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from}
                    onSelect={(date) => 
                      handleFilterChange("dateRange", { ...filters.dateRange, from: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      format(filters.dateRange.to, "PPP")
                    ) : (
                      <span>To date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to}
                    onSelect={(date) => 
                      handleFilterChange("dateRange", { ...filters.dateRange, to: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Courses */}
          <div className="space-y-2">
            <Label>Courses</Label>
            <Select
              onValueChange={(value) => {
                if (!filters.courses.includes(value)) {
                  handleArrayFilterChange("courses", value, true);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select courses" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.courses.map(course => {
                const option = COURSE_OPTIONS.find(opt => opt.value === course);
                return (
                  <Badge key={course} variant="secondary" className="text-xs">
                    {option?.label}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleArrayFilterChange("courses", course, false)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Teachers */}
          <div className="space-y-2">
            <Label>Teachers</Label>
            <Select
              onValueChange={(value) => {
                if (!filters.teachers.includes(value)) {
                  handleArrayFilterChange("teachers", value, true);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select teachers" />
              </SelectTrigger>
              <SelectContent>
                {TEACHER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.teachers.map(teacher => {
                const option = TEACHER_OPTIONS.find(opt => opt.value === teacher);
                return (
                  <Badge key={teacher} variant="secondary" className="text-xs">
                    {option?.label}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleArrayFilterChange("teachers", teacher, false)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <Label>Metrics</Label>
            <Select
              onValueChange={(value) => {
                if (!filters.metrics.includes(value)) {
                  handleArrayFilterChange("metrics", value, true);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metrics" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.metrics.map(metric => {
                const option = METRIC_OPTIONS.find(opt => opt.value === metric);
                return (
                  <Badge key={metric} variant="secondary" className="text-xs">
                    {option?.label}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleArrayFilterChange("metrics", metric, false)}
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Student Search */}
          <div className="space-y-2">
            <Label>Student Search</Label>
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}