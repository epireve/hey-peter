'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import type { Content, ContentStatus } from '@/types/content';

interface ContentWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: Content | null;
  onSave: (content: Content) => void;
}

export function ContentWorkflowDialog({
  open,
  onOpenChange,
  content,
  onSave,
}: ContentWorkflowDialogProps) {
  const [formData, setFormData] = useState<Partial<Content>>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'lessons',
    tags: [],
    status: 'draft',
  });
  const [tagInput, setTagInput] = useState('');
  const [scheduledPublish, setScheduledPublish] = useState('');
  const [scheduledUnpublish, setScheduledUnpublish] = useState('');

  useEffect(() => {
    if (content) {
      setFormData(content);
      setScheduledPublish(content.scheduled_publish_at || '');
      setScheduledUnpublish(content.scheduled_unpublish_at || '');
    } else {
      setFormData({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'lessons',
        tags: [],
        status: 'draft',
      });
      setScheduledPublish('');
      setScheduledUnpublish('');
    }
  }, [content]);

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-');
    
    const newContent: Content = {
      id: content?.id || `content-${Date.now()}`,
      title: formData.title,
      slug,
      content: formData.content,
      excerpt: formData.excerpt,
      category: formData.category || 'lessons',
      tags: formData.tags || [],
      status: formData.status || 'draft',
      author_id: 'current-user', // In production, get from auth context
      version: content?.version ? content.version + 1 : 1,
      scheduled_publish_at: scheduledPublish || undefined,
      scheduled_unpublish_at: scheduledUnpublish || undefined,
      created_at: content?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(newContent);
    
    toast({
      title: content ? 'Content Updated' : 'Content Created',
      description: `${newContent.title} has been ${content ? 'updated' : 'created'} successfully`,
    });
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || [],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{content ? 'Edit Content' : 'Create New Content'}</DialogTitle>
          <DialogDescription>
            {content ? 'Update content details and manage workflow' : 'Create new content for your courses'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="mt-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter content title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="auto-generated-from-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Brief description of the content"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your content here..."
                rows={10}
                className="font-mono"
              />
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lessons">Lessons</SelectItem>
                  <SelectItem value="resources">Resources</SelectItem>
                  <SelectItem value="assessments">Assessments</SelectItem>
                  <SelectItem value="announcements">Announcements</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" variant="secondary" onClick={handleAddTag}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags?.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Status</CardTitle>
                <CardDescription>Manage the content workflow status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Current Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as ContentStatus }))}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {content && content.version > 1 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Version History</p>
                    <p className="text-sm text-muted-foreground">Current version: {content.version}</p>
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      View previous versions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Scheduling</CardTitle>
                <CardDescription>Schedule automatic publishing and unpublishing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-publish">Scheduled Publish Date</Label>
                  <div className="flex gap-2">
                    <Calendar className="h-4 w-4 mt-2 text-muted-foreground" />
                    <Input
                      id="scheduled-publish"
                      type="datetime-local"
                      value={scheduledPublish}
                      onChange={(e) => setScheduledPublish(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-unpublish">Scheduled Unpublish Date</Label>
                  <div className="flex gap-2">
                    <Clock className="h-4 w-4 mt-2 text-muted-foreground" />
                    <Input
                      id="scheduled-unpublish"
                      type="datetime-local"
                      value={scheduledUnpublish}
                      onChange={(e) => setScheduledUnpublish(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {content ? 'Update Content' : 'Create Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}