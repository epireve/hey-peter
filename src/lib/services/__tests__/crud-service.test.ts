import { CRUDService, withRetry } from "../crud-service";
import { supabase } from "@/lib/supabase";

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

describe("CRUDService", () => {
  let service: CRUDService;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockOrder: jest.Mock;
  let mockRange: jest.Mock;
  let mockIn: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnThis();
    mockIn = jest.fn().mockResolvedValue({ error: null });
    mockRange = jest.fn().mockReturnThis();
    mockOrder = jest.fn().mockReturnThis();
    
    // Create a chainable mock object for select
    const selectChain = {
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: mockSingle,
    };
    
    mockSelect = jest.fn().mockResolvedValue({ 
      data: null, 
      error: null,
      count: 0,
    });
    mockSelect.mockReturnValue(selectChain);
    
    // For insert operations
    const insertSelectChain = {
      ...selectChain,
      single: mockSingle,
    };
    const insertSelect = jest.fn().mockReturnValue(insertSelectChain);
    
    mockInsert = jest.fn().mockReturnValue({ 
      select: insertSelect 
    });
    
    // For update operations
    const updateSelectChain = {
      ...selectChain,
      single: mockSingle,
    };
    const updateSelect = jest.fn().mockReturnValue(updateSelectChain);
    const updateEq = jest.fn().mockReturnValue({
      select: updateSelect,
    });
    
    mockUpdate = jest.fn().mockReturnValue({ 
      eq: updateEq 
    });
    
    mockDelete = jest.fn().mockReturnValue({ 
      eq: mockEq,
      in: mockIn,
    });
    
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    (supabase.from as jest.Mock) = mockFrom;

    // Create service instance
    service = new CRUDService({ 
      table: "test_table",
      cache: { enabled: false } // Disable cache for testing
    });
  });

  describe("getAll", () => {
    it("should fetch all records", async () => {
      const mockData = [{ id: 1, name: "Test 1" }, { id: 2, name: "Test 2" }];
      mockSelect.mockResolvedValue({ 
        data: mockData, 
        error: null, 
        count: 2,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      const result = await service.getAll();

      expect(mockFrom).toHaveBeenCalledWith("test_table");
      expect(mockSelect).toHaveBeenCalledWith("*", { count: "exact" });
      expect(result).toEqual({ data: mockData, error: null, count: 2 });
    });

    it("should apply filters", async () => {
      await service.getAll({
        filters: [
          { column: "status", operator: "eq", value: "active" },
          { column: "age", operator: "gt", value: 18 },
        ],
      });

      const selectChain = mockSelect.mock.results[0].value;
      expect(selectChain.eq).toHaveBeenCalledWith("status", "active");
      expect(selectChain.gt).toHaveBeenCalledWith("age", 18);
    });

    it("should apply pagination", async () => {
      await service.getAll({
        pagination: { page: 2, pageSize: 10 },
      });

      const selectChain = mockSelect.mock.results[0].value;
      expect(selectChain.range).toHaveBeenCalledWith(10, 19);
    });

    it("should handle errors", async () => {
      const mockError = new Error("Database error");
      mockSelect.mockRejectedValue(mockError);

      const result = await service.getAll();

      expect(result).toEqual({ data: null, error: mockError });
    });
  });

  describe("getById", () => {
    it("should fetch a single record by ID", async () => {
      const mockData = { id: 1, name: "Test Item" };
      mockSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getById(1);

      expect(mockFrom).toHaveBeenCalledWith("test_table");
      expect(mockSelect).toHaveBeenCalledWith("*");
      
      const selectChain = mockSelect.mock.results[0].value;
      expect(selectChain.eq).toHaveBeenCalledWith("id", 1);
      expect(selectChain.single).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData, error: null });
    });

    it("should handle not found", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await service.getById(999);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("create", () => {
    it("should create a new record", async () => {
      const newData = { name: "New Item" };
      const createdData = { id: 1, ...newData };
      mockSingle.mockResolvedValue({ data: createdData, error: null });

      const result = await service.create(newData);

      expect(mockInsert).toHaveBeenCalledWith(newData);
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(result).toEqual({ data: createdData, error: null });
    });

    it("should handle validation errors", async () => {
      const mockError = { code: "23505", message: "Duplicate key" };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await service.create({ name: "Duplicate" });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe("update", () => {
    it("should update an existing record", async () => {
      const updates = { name: "Updated Name" };
      const updatedData = { id: 1, ...updates };
      mockSingle.mockResolvedValue({ data: updatedData, error: null });

      const result = await service.update(1, updates);

      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith("id", 1);
      expect(result).toEqual({ data: updatedData, error: null });
    });
  });

  describe("delete", () => {
    it("should delete a record", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await service.delete(1);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", 1);
      expect(result).toEqual({ error: null });
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple records", async () => {
      mockIn.mockResolvedValue({ error: null });

      const result = await service.deleteMany([1, 2, 3]);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockIn).toHaveBeenCalledWith("id", [1, 2, 3]);
      expect(result).toEqual({ error: null });
    });
  });

  describe("caching", () => {
    it("should cache results when enabled", async () => {
      const cachedService = new CRUDService({
        table: "cached_table",
        cache: { enabled: true, ttl: 1000 },
      });

      const mockData = [{ id: 1, name: "Cached Item" }];
      mockSelect.mockResolvedValue({ 
        data: mockData, 
        error: null,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      // First call - should hit database
      const result1 = await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(1); // Still 1, not 2

      expect(result1).toEqual(result2);
    });

    it("should invalidate cache after TTL", async () => {
      const cachedService = new CRUDService({
        table: "cached_table",
        cache: { enabled: true, ttl: 100 }, // 100ms TTL
      });

      const mockData = [{ id: 1, name: "Item" }];
      mockSelect.mockResolvedValue({ 
        data: mockData, 
        error: null,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      // First call
      await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call - should hit database again
      await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("should clear cache on mutations", async () => {
      const cachedService = new CRUDService({
        table: "cached_table",
        cache: { enabled: true },
      });

      const mockData = [{ id: 1, name: "Item" }];
      mockSelect.mockResolvedValue({ 
        data: mockData, 
        error: null,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
      });

      // Cache data
      await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Perform mutation
      mockSingle.mockResolvedValue({ data: { id: 2 }, error: null });
      await cachedService.create({ name: "New" });

      // Next getAll should hit database
      await cachedService.getAll();
      expect(mockFrom).toHaveBeenCalledTimes(3); // 1 for initial, 1 for create, 1 for getAll
    });
  });
});

describe("withRetry", () => {
  it("should retry on failure", async () => {
    const mockFn = jest.fn();
    mockFn
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValueOnce("Success");

    const result = await withRetry(mockFn, { maxRetries: 3, delay: 10 });

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(result).toBe("Success");
  });

  it("should call onRetry callback", async () => {
    const mockFn = jest.fn();
    const onRetry = jest.fn();
    
    mockFn
      .mockRejectedValueOnce(new Error("Error 1"))
      .mockRejectedValueOnce(new Error("Error 2"))
      .mockResolvedValueOnce("Success");

    await withRetry(mockFn, { maxRetries: 3, delay: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2);
  });

  it("should throw after max retries", async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error("Persistent error"));

    await expect(
      withRetry(mockFn, { maxRetries: 2, delay: 10 })
    ).rejects.toThrow("Persistent error");

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});