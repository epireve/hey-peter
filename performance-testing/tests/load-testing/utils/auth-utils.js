import http from 'k6/http';
import { check } from 'k6';
import { baseConfig, requestOptions } from '../config/test-config.js';

/**
 * Authenticate a user and return session data
 * @param {Object} user - User credentials
 * @returns {Object} Authentication session data
 */
export function authenticateUser(user) {
  const loginPayload = {
    email: user.email,
    password: user.password,
  };

  const response = http.post(
    `${baseConfig.apiBaseURL}${baseConfig.auth.loginEndpoint}`,
    JSON.stringify(loginPayload),
    requestOptions
  );

  const authSuccess = check(response, {
    'login successful': (r) => r.status === 200 || r.status === 302,
    'login response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!authSuccess) {
    console.error(`Authentication failed for user ${user.email}: ${response.status}`);
    return null;
  }

  // Extract session data (cookies, tokens)
  const sessionData = {
    cookies: response.cookies,
    headers: {},
    user: user,
  };

  // Extract authorization header if present
  if (response.headers['Authorization']) {
    sessionData.headers['Authorization'] = response.headers['Authorization'];
  }

  // Extract session cookies
  if (response.cookies && response.cookies.length > 0) {
    sessionData.headers['Cookie'] = response.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  return sessionData;
}

/**
 * Create authenticated request options with session data
 * @param {Object} sessionData - Session data from authentication
 * @returns {Object} Request options with authentication
 */
export function getAuthenticatedRequestOptions(sessionData) {
  return {
    ...requestOptions,
    headers: {
      ...requestOptions.headers,
      ...sessionData.headers,
    },
  };
}

/**
 * Register a new user account
 * @param {Object} userData - User registration data
 * @returns {Object} Registration response
 */
export function registerUser(userData) {
  const registrationPayload = {
    email: userData.email,
    password: userData.password,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
  };

  const response = http.post(
    `${baseConfig.apiBaseURL}${baseConfig.auth.signupEndpoint}`,
    JSON.stringify(registrationPayload),
    requestOptions
  );

  check(response, {
    'registration successful': (r) => r.status === 201 || r.status === 200,
    'registration response time < 3s': (r) => r.timings.duration < 3000,
  });

  return response;
}

/**
 * Logout user and invalidate session
 * @param {Object} sessionData - Current session data
 * @returns {Object} Logout response
 */
export function logoutUser(sessionData) {
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  const response = http.post(
    `${baseConfig.apiBaseURL}${baseConfig.auth.logoutEndpoint}`,
    null,
    authOptions
  );

  check(response, {
    'logout successful': (r) => r.status === 200 || r.status === 204,
    'logout response time < 1s': (r) => r.timings.duration < 1000,
  });

  return response;
}

/**
 * Get random user from test data based on role
 * @param {string} role - User role (student, teacher, admin)
 * @returns {Object} Random user data
 */
export function getRandomUser(role = 'student') {
  const users = baseConfig.testUsers[`${role}s`] || baseConfig.testUsers.students;
  return users[Math.floor(Math.random() * users.length)];
}

/**
 * Validate session is still active
 * @param {Object} sessionData - Current session data
 * @returns {boolean} Whether session is valid
 */
export function validateSession(sessionData) {
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  const response = http.get(
    `${baseConfig.apiBaseURL}/auth/me`,
    authOptions
  );

  return check(response, {
    'session valid': (r) => r.status === 200,
    'session check response time < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Refresh authentication token if needed
 * @param {Object} sessionData - Current session data
 * @returns {Object} Updated session data
 */
export function refreshAuthToken(sessionData) {
  const authOptions = getAuthenticatedRequestOptions(sessionData);
  
  const response = http.post(
    `${baseConfig.apiBaseURL}/auth/refresh`,
    null,
    authOptions
  );

  if (check(response, { 'token refresh successful': (r) => r.status === 200 })) {
    // Update session data with new token
    if (response.headers['Authorization']) {
      sessionData.headers['Authorization'] = response.headers['Authorization'];
    }
  }

  return sessionData;
}