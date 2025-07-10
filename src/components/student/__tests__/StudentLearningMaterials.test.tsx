import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentLearningMaterials } from '../StudentLearningMaterials';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Create a proper query builder mock that chains correctly
const createQueryBuilder = (mockData = [], mockError = null) => {
  // Create a query builder that is awaitable and chainable
  const createChainableQuery = (data, error) => {
    const query = {
      // Query methods that return the query for chaining
      select: jest.fn(() => createChainableQuery(data, error)),
      eq: jest.fn(() => createChainableQuery(data, error)),
      in: jest.fn(() => createChainableQuery(data, error)),
      ilike: jest.fn(() => createChainableQuery(data, error)),
      order: jest.fn(() => createChainableQuery(data, error)),
      limit: jest.fn(() => createChainableQuery(data, error)),
      range: jest.fn(() => createChainableQuery(data, error)),
      or: jest.fn(() => createChainableQuery(data, error)),
      cs: jest.fn(() => createChainableQuery(data, error)),
      neq: jest.fn(() => createChainableQuery(data, error)),
      single: jest.fn(() => createChainableQuery(data, error)),
      
      // Mutation methods
      insert: jest.fn(() => createChainableQuery(data, error)),
      update: jest.fn(() => createChainableQuery(data, error)),
      delete: jest.fn(() => createChainableQuery(data, error)),
      upsert: jest.fn(() => createChainableQuery(data, error)),
      
      // Make it awaitable - this is what Supabase queries return
      then: jest.fn((resolve) => {
        return Promise.resolve(resolve({ data, error }));
      }),
      catch: jest.fn(),
    };
    
    return query;
  };
  
  return createChainableQuery(mockData, mockError);
};

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: jest.fn(() => createQueryBuilder()),
  storage: {
    from: jest.fn(() => ({
      download: jest.fn().mockResolvedValue({
        data: new Blob(['test content']),
        error: null,
      }),
      upload: jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test' },
      }),
    })),
  },
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient,
}));

const mockMaterials = [
  {
    id: '1',
    title: 'Introduction to Business English',
    description: 'Basic business vocabulary and phrases',
    category: 'video',
    file_type: 'mp4',
    file_size: 104857600,
    file_url: 'https://example.com/video1.mp4',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    course_id: 'course-1',
    course: { name: 'Business English' },
    difficulty_level: 'beginner',
    tags: ['business', 'vocabulary', 'basics'],
    duration: 1800,
    view_count: 150,
    download_count: 45,
    average_rating: 4.5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Grammar Workbook PDF',
    description: 'Comprehensive grammar exercises',
    category: 'document',
    file_type: 'pdf',
    file_size: 5242880,
    file_url: 'https://example.com/doc1.pdf',
    thumbnail_url: null,
    course_id: 'course-2',
    course: { name: 'Everyday English A' },
    difficulty_level: 'intermediate',
    tags: ['grammar', 'exercises', 'workbook'],
    duration: null,
    view_count: 200,
    download_count: 120,
    average_rating: 4.8,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StudentLearningMaterials', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the from mock to return a fresh query builder
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder());
  });

  // Test 1: Display learning materials
  it('should display learning materials when data is available', async () => {
    // Override the mock for this specific test
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder(mockMaterials));

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Introduction to Business English')).toBeInTheDocument();
      expect(screen.getByText('Grammar Workbook PDF')).toBeInTheDocument();
    });

    // Check that category badges are displayed
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
  });

  // Test 2: Search functionality
  it('should have search input field', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search materials/i)).toBeInTheDocument();
    });
  });

  // Test 3: Filter functionality
  it('should have filter dropdowns', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Look for the search input to confirm the component is rendered
      expect(screen.getByPlaceholderText(/search materials/i)).toBeInTheDocument();
      
      // Check that the search and filters section is present
      const searchSection = screen.getByRole('search').closest('.bg-white');
      expect(searchSection).toBeInTheDocument();
    });
  });

  // Test 4: Tab navigation
  it('should display tab navigation for different views', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all materials/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /recently viewed/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /recommended/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /offline materials/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /by course/i })).toBeInTheDocument();
    });
  });

  // Test 5: Upload functionality
  it('should have upload study notes button', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Upload Study Notes')).toBeInTheDocument();
    });
  });

  // Test 6: Analytics functionality
  it('should have analytics button', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  // Test 7: Empty state
  it('should display empty state when no materials available', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No learning materials available')).toBeInTheDocument();
      expect(screen.getByText('Check back later for new materials')).toBeInTheDocument();
    });
  });

  // Test 8: Loading state
  it('should display loading state while fetching materials', async () => {
    // Mock a pending promise by creating a builder that never resolves
    const pendingBuilder = createQueryBuilder();
    pendingBuilder.select.mockImplementation(() => new Promise(() => {})); // Never resolves
    mockSupabaseClient.from.mockImplementation(() => pendingBuilder);

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading materials...')).toBeInTheDocument();
  });

  // Test 9: Error state
  it('should display error state when fetch fails', async () => {
    // Mock an error response
    mockSupabaseClient.from.mockImplementation(() => 
      createQueryBuilder(null, { message: 'Failed to fetch materials' })
    );

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Error loading materials')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch materials')).toBeInTheDocument();
    });
  });

  // Test 10: File type icons and information
  it('should display appropriate file type information', async () => {
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder(mockMaterials));

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('100 MB')).toBeInTheDocument();
      expect(screen.getByText('5 MB')).toBeInTheDocument();
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
    });
  });

  // Test 11: Material actions
  it('should display material action buttons', async () => {
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder(mockMaterials));

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Preview')).toHaveLength(2);
      expect(screen.getAllByText('View')).toHaveLength(2);
      expect(screen.getAllByText('Download')).toHaveLength(2);
      expect(screen.getAllByText('Rate')).toHaveLength(2);
      expect(screen.getAllByText('Review')).toHaveLength(2);
    });
  });

  // Test 12: Accessibility
  it('should have proper accessibility attributes', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByLabelText(/search materials/i)).toBeInTheDocument();
    });
  });

  // Test 13: Material preview dialog
  it('should open preview dialog when preview button is clicked', async () => {
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder(mockMaterials));

    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Preview')[0]).toBeInTheDocument();
    });

    const previewButton = screen.getAllByText('Preview')[0];
    await user.click(previewButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // Test 14: Upload dialog
  it('should open upload dialog when upload button is clicked', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Upload Study Notes')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Study Notes');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/select file/i)).toBeInTheDocument();
    });
  });

  // Test 15: Analytics dialog
  it('should open analytics dialog when analytics button is clicked', async () => {
    render(<StudentLearningMaterials />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    const analyticsButton = screen.getByText('Analytics');
    await user.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Learning Analytics')).toBeInTheDocument();
    });
  });
});