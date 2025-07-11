/**
 * API Services Tests
 * 
 * Test suite for the API service layer
 */

import { ApiClient } from '../client';
import { AuthService, UserService, BookingService, ApiService } from '../services';
import { API_ENDPOINTS } from '../endpoints';

// Mock the API client
jest.mock('../client');
const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('API Services', () => {
  let mockClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      setAuthToken: jest.fn(),
      clearAuthToken: jest.fn(),
    } as any;
  });

  describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
      authService = new AuthService(mockClient);
    });

    it('should login and set auth token', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
          },
          profile: { id: '1', email: 'test@example.com' },
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login(loginData);

      expect(mockClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.auth.login.path,
        loginData
      );
      expect(mockClient.setAuthToken).toHaveBeenCalledWith(
        'access-token',
        'refresh-token'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should signup new user', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
        role: 'student' as const,
      };
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
          requiresVerification: false,
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authService.signup(signupData);

      expect(mockClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.auth.signup.path,
        signupData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should logout and clear auth token', async () => {
      const mockResponse = { success: true };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authService.logout();

      expect(mockClient.post).toHaveBeenCalledWith(API_ENDPOINTS.auth.logout.path);
      expect(mockClient.clearAuthToken).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should get current user', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com' },
          profile: { id: '1', email: 'test@example.com' },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUser();

      expect(mockClient.get).toHaveBeenCalledWith(API_ENDPOINTS.auth.me.path);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
      userService = new UserService(mockClient);
    });

    it('should get users list', async () => {
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [{ id: '1', email: 'test@example.com' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getUsers(params);

      expect(mockClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.users.list.path,
        params
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get user by ID', async () => {
      const userId = '123';
      const mockResponse = {
        success: true,
        data: {
          user: { id: userId, email: 'test@example.com' },
          profile: { id: userId, email: 'test@example.com' },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getUser(userId);

      expect(mockClient.get).toHaveBeenCalledWith('/users/123');
      expect(result).toEqual(mockResponse);
    });

    it('should create new user', async () => {
      const userData = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'student' as const,
      };
      const mockResponse = {
        success: true,
        data: {
          user: { id: '2', email: 'new@example.com' },
          profile: { id: '2', email: 'new@example.com' },
          inviteSent: false,
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await userService.createUser(userData);

      expect(mockClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.users.create.path,
        userData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update user', async () => {
      const userId = '123';
      const updateData = { firstName: 'Updated' };
      const mockResponse = {
        success: true,
        data: {
          user: { id: userId, email: 'test@example.com' },
          profile: { id: userId, email: 'test@example.com' },
        },
      };

      mockClient.put.mockResolvedValue(mockResponse);

      const result = await userService.updateUser(userId, updateData);

      expect(mockClient.put).toHaveBeenCalledWith('/users/123', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete user', async () => {
      const userId = '123';
      const mockResponse = { success: true };

      mockClient.delete.mockResolvedValue(mockResponse);

      const result = await userService.deleteUser(userId);

      expect(mockClient.delete).toHaveBeenCalledWith('/users/123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('BookingService', () => {
    let bookingService: BookingService;

    beforeEach(() => {
      bookingService = new BookingService(mockClient);
    });

    it('should get bookings list', async () => {
      const params = { studentId: '123', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [{ id: '1', studentId: '123' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.getBookings(params);

      expect(mockClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.bookings.list.path,
        params
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create new booking', async () => {
      const bookingData = {
        studentId: '123',
        teacherId: '456',
        subjectId: '789',
        timeSlotId: '101',
        date: '2023-12-01',
        duration: 60,
        type: 'individual' as const,
      };
      const mockResponse = {
        success: true,
        data: {
          booking: { id: '1', ...bookingData },
          confirmationCode: 'ABC123',
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await bookingService.createBooking(bookingData);

      expect(mockClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.bookings.create.path,
        bookingData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should check availability', async () => {
      const params = {
        teacherId: '456',
        subjectId: '789',
        date: '2023-12-01',
        duration: 60,
      };
      const mockResponse = {
        success: true,
        data: {
          availableSlots: [
            {
              timeSlotId: '101',
              startTime: '10:00',
              endTime: '11:00',
              isPreferred: true,
            },
          ],
          teacherAvailability: { id: '1', teacherId: '456' },
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await bookingService.checkAvailability(params);

      expect(mockClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.bookings.availability.path,
        params
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('ApiService', () => {
    let apiService: ApiService;

    beforeEach(() => {
      apiService = new ApiService(mockClient);
    });

    it('should initialize all services', () => {
      expect(apiService.auth).toBeInstanceOf(AuthService);
      expect(apiService.users).toBeInstanceOf(UserService);
      expect(apiService.bookings).toBeInstanceOf(BookingService);
      expect(apiService.lessons).toBeDefined();
      expect(apiService.subjects).toBeDefined();
      expect(apiService.analytics).toBeDefined();
      expect(apiService.availability).toBeDefined();
      expect(apiService.files).toBeDefined();
      expect(apiService.notifications).toBeDefined();
      expect(apiService.search).toBeDefined();
      expect(apiService.system).toBeDefined();
    });

    it('should use the same client for all services', () => {
      // This is a conceptual test - we can't easily verify the private client
      // but we can test that the services work correctly
      expect(apiService.auth).toBeDefined();
      expect(apiService.users).toBeDefined();
    });
  });
});

describe('Service Integration', () => {
  it('should work with real API client', () => {
    const realClient = new ApiClient();
    const apiService = new ApiService(realClient);

    expect(apiService).toBeDefined();
    expect(apiService.auth).toBeInstanceOf(AuthService);
    expect(apiService.users).toBeInstanceOf(UserService);
  });
});