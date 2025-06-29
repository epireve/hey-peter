'use client';

import React from 'react';
import { MoreVertical, Edit, Archive, Eye, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { Content, ContentStatus } from '@/types/content';

interface ContentListItemProps {
  content: Content;
  onEdit: (content: Content) => void;
  onStatusChange: (contentId: string, status: ContentStatus) => void;
}

const statusColors: Record<ContentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

export function ContentListItem({ content, onEdit, onStatusChange }: ContentListItemProps) {
  const canPublish = content.status === 'approved';
  const canSubmitForReview = content.status === 'draft';
  const canApprove = content.status === 'pending_review';
  const canArchive = content.status === 'published';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{content.title}</h3>
          <Badge className={statusColors[content.status]} variant="secondary">
            {content.status.replace('_', ' ')}
          </Badge>
          {content.version > 1 && (
            <Badge variant="outline">v{content.version}</Badge>
          )}
        </div>
        {content.excerpt && (
          <p className="text-sm text-muted-foreground">{content.excerpt}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Category: {content.category}</span>
          {content.tags && content.tags.length > 0 && (
            <span>Tags: {content.tags.join(', ')}</span>
          )}
          <span>Updated: {format(new Date(content.updated_at), 'MMM d, yyyy')}</span>
          {content.published_at && (
            <span>Published: {format(new Date(content.published_at), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(content)}>
          <Edit className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onEdit(content)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Content
            </DropdownMenuItem>
            
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {canSubmitForReview && (
              <DropdownMenuItem onClick={() => onStatusChange(content.id, 'pending_review')}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </DropdownMenuItem>
            )}
            
            {canApprove && (
              <DropdownMenuItem onClick={() => onStatusChange(content.id, 'approved')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </DropdownMenuItem>
            )}
            
            {canPublish && (
              <DropdownMenuItem onClick={() => onStatusChange(content.id, 'published')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
            )}
            
            {canArchive && (
              <DropdownMenuItem onClick={() => onStatusChange(content.id, 'archived')}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}