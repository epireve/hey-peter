// Mock for @supabase/auth-helpers-nextjs

const createMockQueryBuilder = () => {
  const builder = {};
  
  const methods = [
    'select', 'eq', 'in', 'ilike', 'order', 'limit', 'single', 
    'insert', 'update', 'delete', 'range', 'or', 'upsert'
  ];
  
  methods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  
  // Add resolved value for terminal methods
  builder.select.mockResolvedValue({ data: [], error: null });
  builder.insert.mockResolvedValue({ data: null, error: null });
  builder.update.mockResolvedValue({ data: null, error: null });
  builder.delete.mockResolvedValue({ data: null, error: null });
  builder.upsert.mockResolvedValue({ data: null, error: null });
  
  return builder;
};

export const createClientComponentClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  },
  from: jest.fn(() => createMockQueryBuilder()),
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
}));