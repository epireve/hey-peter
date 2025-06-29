export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';

export interface Content {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  course_id?: string;
  category: string;
  tags?: string[];
  status: ContentStatus;
  author_id: string;
  reviewer_id?: string;
  published_at?: string;
  scheduled_publish_at?: string;
  scheduled_unpublish_at?: string;
  version: number;
  parent_version_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  title: string;
  content: string;
  excerpt?: string;
  version: number;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

export interface ContentApproval {
  id: string;
  content_id: string;
  version: number;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comments?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ContentComment {
  id: string;
  content_id: string;
  version: number;
  user_id: string;
  comment: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  order: number;
  created_at: string;
  updated_at: string;
}