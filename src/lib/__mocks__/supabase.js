// Mock for src/lib/supabase.ts

const createMockQueryBuilder = (defaultResponse = { data: [], error: null, count: 0 }) => {
  const builder = {
    // Make the builder itself thenable (promise-like)
    then: jest.fn().mockImplementation((resolve) => resolve(defaultResponse)),
    catch: jest.fn().mockReturnThis(),
    finally: jest.fn().mockReturnThis(),
    
    // Mock response methods for chaining
    mockResolvedValue: jest.fn().mockReturnValue(builder),
    mockResolvedValueOnce: jest.fn().mockReturnValue(builder),
    mockRejectedValue: jest.fn().mockReturnValue(builder),
    mockRejectedValueOnce: jest.fn().mockReturnValue(builder),
  };
  
  // All Supabase query methods that might be used
  const methods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 
    'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 
    'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps', 'textSearch',
    'filter', 'not', 'or', 'and', 'order', 'limit', 'range', 'offset',
    'single', 'maybeSingle', 'insert', 'update', 'upsert', 'delete',
    'rpc', 'csv', 'geojson', 'explain', 'rollback', 'returns'
  ];
  
  methods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
    // Also add mock response methods to each method
    builder[method].mockResolvedValue = jest.fn().mockReturnValue(builder);
    builder[method].mockResolvedValueOnce = jest.fn().mockReturnValue(builder);
    builder[method].mockRejectedValue = jest.fn().mockReturnValue(builder);
    builder[method].mockRejectedValueOnce = jest.fn().mockReturnValue(builder);
  });
  
  // Override specific terminal methods to return promises directly
  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  
  return builder;
};

const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    }),
  },
  from: jest.fn(() => createMockQueryBuilder()),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
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
});

// Mock the createClient function
const createClient = jest.fn(() => createMockSupabaseClient());

// Mock the default supabase client export
const supabase = createMockSupabaseClient();

// Export both named and default exports
module.exports = {
  createClient,
  supabase,
  __esModule: true,
  default: { createClient, supabase }
};

// Also support ES6 named exports
exports.createClient = createClient;
exports.supabase = supabase;