import { Metadata } from 'next';
import { ContentManagementClient } from '@/components/admin/content/ContentManagementClient';

export const metadata: Metadata = {
  title: 'Content Management',
  description: 'Manage course content and materials',
};

// Mock data for now - in production this would come from Supabase
const mockContent = [
  {
    id: '1',
    title: 'Introduction to Business English',
    slug: 'intro-business-english',
    content: 'Learn the fundamentals of Business English...',
    excerpt: 'A comprehensive introduction to Business English',
    category: 'lessons',
    tags: ['business', 'beginner'],
    status: 'published' as const,
    author_id: 'user-1',
    version: 1,
    published_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Advanced Grammar Patterns',
    slug: 'advanced-grammar',
    content: 'Master complex grammar structures...',
    excerpt: 'Deep dive into advanced English grammar',
    category: 'lessons',
    tags: ['grammar', 'advanced'],
    status: 'draft' as const,
    author_id: 'user-2',
    version: 2,
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-10T10:00:00Z',
  },
  {
    id: '3',
    title: 'Speaking Practice Guide',
    slug: 'speaking-practice',
    content: 'Improve your speaking skills...',
    excerpt: 'Practical tips for English speaking',
    category: 'resources',
    tags: ['speaking', 'practice'],
    status: 'pending_review' as const,
    author_id: 'user-1',
    reviewer_id: 'user-3',
    version: 1,
    created_at: '2024-02-15T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
];

export default function ContentManagementPage() {
  return <ContentManagementClient initialContent={mockContent} />;
}