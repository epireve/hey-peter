'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle, Archive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentWorkflowDialog } from './ContentWorkflowDialog';
import { ContentListItem } from './ContentListItem';
import type { Content, ContentStatus } from '@/types/content';

interface ContentManagementClientProps {
  initialContent: Content[];
}

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500', icon: CheckCircle },
  published: { label: 'Published', color: 'bg-green-500', icon: CheckCircle },
  archived: { label: 'Archived', color: 'bg-gray-400', icon: Archive },
};

export function ContentManagementClient({ initialContent }: ContentManagementClientProps) {
  const [content, setContent] = useState<Content[]>(initialContent);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Group content by status
  const contentByStatus = filteredContent.reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = [];
    acc[item.status].push(item);
    return acc;
  }, {} as Record<ContentStatus, Content[]>);

  const handleStatusChange = (contentId: string, newStatus: ContentStatus) => {
    setContent(prev => prev.map(item => 
      item.id === contentId ? { ...item, status: newStatus } : item
    ));
  };

  const handleEdit = (item: Content) => {
    setSelectedContent(item);
    setShowWorkflowDialog(true);
  };

  const handleCreateNew = () => {
    setSelectedContent(null);
    setShowWorkflowDialog(true);
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Management</h1>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Content
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = content.filter(c => c.status === status).length;
          const Icon = config.icon;
          
          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? 'item' : 'items'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ContentStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="lessons">Lessons</SelectItem>
                <SelectItem value="resources">Resources</SelectItem>
                <SelectItem value="assessments">Assessments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Content ({filteredContent.length})</TabsTrigger>
          <TabsTrigger value="workflow">By Status</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Items</CardTitle>
              <CardDescription>Manage your content library</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredContent.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No content found matching your filters
                  </div>
                ) : (
                  filteredContent.map(item => (
                    <ContentListItem
                      key={item.id}
                      content={item}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const items = contentByStatus[status as ContentStatus] || [];
            
            return (
              <Card key={status}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                    <CardTitle>{config.label}</CardTitle>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No content in this status
                      </div>
                    ) : (
                      items.map(item => (
                        <ContentListItem
                          key={item.id}
                          content={item}
                          onEdit={handleEdit}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Workflow Dialog */}
      <ContentWorkflowDialog
        open={showWorkflowDialog}
        onOpenChange={setShowWorkflowDialog}
        content={selectedContent}
        onSave={(updatedContent) => {
          if (selectedContent) {
            setContent(prev => prev.map(item => 
              item.id === updatedContent.id ? updatedContent : item
            ));
          } else {
            setContent(prev => [...prev, updatedContent]);
          }
          setShowWorkflowDialog(false);
        }}
      />
    </div>
  );
}