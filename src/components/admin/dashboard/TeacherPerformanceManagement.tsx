"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Mail,
  MessageSquare,
  Settings,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  Calendar,
  Target,
  BarChart3,
  FileText,
  Send,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TeacherPerformanceDashboard } from "./analytics/TeacherPerformanceDashboard";
import { TeacherComparisonAnalytics } from "./analytics/TeacherComparisonAnalytics";
import { TeacherIndividualAnalytics } from "./analytics/TeacherIndividualAnalytics";
import { TeacherProfileCard } from "./analytics/TeacherPerformanceComponents";
import { enhancedTeacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics-enhanced";
import {
  TeacherPerformanceMetrics,
  TeacherPerformanceFilters,
  TeacherPerformanceSort,
  TeacherPerformanceSearchResult,
  PERFORMANCE_LEVEL_COLORS,
  TREND_COLORS
} from "@/types/teacher-performance";

interface TeacherPerformanceManagementProps {
  className?: string;
}

export function TeacherPerformanceManagement({ className }: TeacherPerformanceManagementProps) {
  const [searchResults, setSearchResults] = useState<TeacherPerformanceSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedView, setSelectedView] = useState<'dashboard' | 'list' | 'comparison' | 'individual'>('dashboard');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  
  // Filter and search state
  const [filters, setFilters] = useState<TeacherPerformanceFilters>({});
  const [sortBy, setSortBy] = useState<TeacherPerformanceSort>({ field: 'overallRating', order: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Dialog states
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    if (selectedView === 'list') {
      loadTeachers();
    }
  }, [filters, sortBy, searchQuery, currentPage, pageSize, selectedView]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Apply search query to filters
      const searchFilters = searchQuery ? {
        ...filters,
        // In a real implementation, you'd search by name, email, etc.
      } : filters;

      const results = await enhancedTeacherPerformanceAnalytics.searchTeachers(
        searchFilters,
        sortBy,
        currentPage,
        pageSize
      );

      setSearchResults(results);
    } catch (err) {
      console.error('Failed to load teachers:', err);
      setError('Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof TeacherPerformanceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSortChange = (field: string) => {
    setSortBy(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleBulkAction = async (action: 'message' | 'assign_training' | 'export' | 'delete') => {
    if (selectedTeachers.length === 0) return;

    try {
      console.log(`Performing ${action} on teachers:`, selectedTeachers);
      
      // In a real implementation, you'd call the appropriate service methods
      switch (action) {
        case 'message':
          // Send message to selected teachers
          break;
        case 'assign_training':
          // Assign training to selected teachers
          break;
        case 'export':
          // Export selected teachers' data
          break;
        case 'delete':
          // Delete selected teachers (with confirmation)
          break;
      }
      
      setSelectedTeachers([]);
      setShowBulkActionsDialog(false);
    } catch (err) {
      console.error(`Failed to perform ${action}:`, err);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const teacherIds = selectedTeachers.length > 0 ? selectedTeachers : 
                        searchResults?.teachers.map(t => t.teacherId) || [];
      
      const report = await enhancedTeacherPerformanceAnalytics.generateTeacherPerformanceReport(
        teacherIds,
        {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        'comprehensive'
      );
      
      console.log('Generated report:', report);
      setShowExportDialog(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (rating: number): 'high' | 'medium' | 'low' => {
    if (rating >= 4.5) return 'high';
    if (rating >= 3.5) return 'medium';
    return 'low';
  };

  const getSortIcon = (field: string) => {
    if (sortBy.field !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortBy.order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Performance Management</h1>
          <p className="text-muted-foreground">
            Comprehensive teacher performance analytics and management system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={selectedView === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('dashboard')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={selectedView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('list')}
          >
            <Users className="w-4 h-4 mr-2" />
            Teachers
          </Button>
          <Button
            variant={selectedView === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('comparison')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Comparison
          </Button>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'dashboard' && (
        <TeacherPerformanceDashboard />
      )}

      {selectedView === 'comparison' && (
        <TeacherComparisonAnalytics />
      )}

      {selectedView === 'individual' && selectedTeacherId && (
        <TeacherIndividualAnalytics teacherId={selectedTeacherId} />
      )}

      {selectedView === 'list' && (
        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers by name, email, or specialization..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Advanced Filters Dialog */}
                  <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Advanced Filters</DialogTitle>
                        <DialogDescription>
                          Filter teachers by various criteria
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="ratingMin">Min Rating</Label>
                            <Input
                              id="ratingMin"
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={filters.ratingRange?.min || ''}
                              onChange={(e) => handleFilterChange('ratingRange', {
                                ...filters.ratingRange,
                                min: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="ratingMax">Max Rating</Label>
                            <Input
                              id="ratingMax"
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={filters.ratingRange?.max || ''}
                              onChange={(e) => handleFilterChange('ratingRange', {
                                ...filters.ratingRange,
                                max: parseFloat(e.target.value) || 5
                              })}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="performanceLevel">Performance Level</Label>
                          <Select
                            value={filters.performanceLevel || ''}
                            onValueChange={(value) => handleFilterChange('performanceLevel', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select performance level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="needsAttention"
                            checked={filters.needsAttention || false}
                            onCheckedChange={(checked) => handleFilterChange('needsAttention', checked)}
                          />
                          <Label htmlFor="needsAttention">Needs Attention</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasActiveRecommendations"
                            checked={filters.hasActiveRecommendations || false}
                            onCheckedChange={(checked) => handleFilterChange('hasActiveRecommendations', checked)}
                          />
                          <Label htmlFor="hasActiveRecommendations">Has Active Recommendations</Label>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Sort Options */}
                  <Select 
                    value={sortBy.field} 
                    onValueChange={(value) => handleSortChange(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overallRating">Overall Rating</SelectItem>
                      <SelectItem value="teacherName">Name</SelectItem>
                      <SelectItem value="experienceYears">Experience</SelectItem>
                      <SelectItem value="studentSatisfaction">Student Satisfaction</SelectItem>
                      <SelectItem value="punctualityRate">Punctuality</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={loadTeachers}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedTeachers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">
                      {selectedTeachers.length} teacher{selectedTeachers.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowBulkActionsDialog(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Bulk Actions
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTeachers([])}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teachers List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{error}</p>
              <Button onClick={loadTeachers} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Teachers List</CardTitle>
                <CardDescription>
                  {searchResults?.totalCount || 0} teacher{(searchResults?.totalCount || 0) !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults?.teachers.map((teacher) => (
                    <div key={teacher.teacherId} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={selectedTeachers.includes(teacher.teacherId)}
                        onCheckedChange={() => handleTeacherSelect(teacher.teacherId)}
                      />
                      
                      <div className="flex-1">
                        <TeacherProfileCard
                          teacher={teacher}
                          onViewDetails={() => {
                            setSelectedTeacherId(teacher.teacherId);
                            setSelectedView('individual');
                          }}
                          onViewAnalytics={() => {
                            setSelectedTeacherId(teacher.teacherId);
                            setSelectedView('individual');
                          }}
                        />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => {
                            setSelectedTeacherId(teacher.teacherId);
                            setSelectedView('individual');
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {searchResults && searchResults.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, searchResults.totalCount)} of {searchResults.totalCount} teachers
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!searchResults.pagination.hasPrevious}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, searchResults.pagination.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(searchResults.pagination.totalPages, prev + 1))}
                        disabled={!searchResults.pagination.hasNext}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActionsDialog} onOpenChange={setShowBulkActionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedTeachers.length} selected teacher{selectedTeachers.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleBulkAction('message')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleBulkAction('assign_training')}
            >
              <Award className="w-4 h-4 mr-2" />
              Assign Training
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleBulkAction('export')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Choose the format for your teacher performance report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleExportReport('pdf')}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF Report
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleExportReport('excel')}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel Spreadsheet
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleExportReport('csv')}
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}