import type {
  User,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  UpdatePasswordRequest,
  UpdateProfileRequest,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  AuditLog,
  PaginatedResponse,
  ApiResult,
} from '../types';

const API_BASE = '/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

// Token management
export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

// API request helper with auth
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const token = tokenManager.getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return data;
}

// Auth API
export const authApi = {
  // Login
  login: async (credentials: LoginRequest): Promise<ApiResult<LoginResponse>> => {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (result.code === 0 && result.data) {
      tokenManager.setTokens(result.data.access_token, result.data.refresh_token);
      tokenManager.setUser(result.data.user);
    }

    return result;
  },

  // Logout
  logout: async (): Promise<ApiResult<null>> => {
    const result = await apiRequest<null>('/auth/logout', {
      method: 'POST',
    });

    tokenManager.clearTokens();
    return result;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<ApiResult<LoginResponse>> => {
    const result = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then(res => res.json());

    if (result.code === 0 && result.data) {
      tokenManager.setTokens(result.data.access_token, result.data.refresh_token);
      tokenManager.setUser(result.data.user);
    }

    return result;
  },

  // Get current user
  getCurrentUser: async (): Promise<ApiResult<User>> => {
    return apiRequest<User>('/auth/me');
  },

  // Update password
  updatePassword: async (data: UpdatePasswordRequest): Promise<ApiResult<null>> => {
    return apiRequest<null>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Update profile (username, email, phone)
  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResult<User>> => {
    const result = await apiRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    // Update stored user info if successful
    if (result.code === 0 && result.data) {
      tokenManager.setUser(result.data);
    }

    return result;
  },

  // Upload avatar (base64)
  uploadAvatar: async (avatarData: string): Promise<ApiResult<{ avatar: string; user: User }>> => {
    const result = await apiRequest<{ avatar: string; user: User }>('/auth/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar: avatarData }),
    });

    // Update stored user info if successful
    if (result.code === 0 && result.data?.user) {
      tokenManager.setUser(result.data.user);
    }

    return result;
  },

  // Upload avatar (file)
  uploadAvatarFile: async (file: File): Promise<ApiResult<{ avatar: string; user: User }>> => {
    const token = tokenManager.getAccessToken();
    
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE}/auth/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    // Update stored user info if successful
    if (result.code === 0 && result.data?.user) {
      tokenManager.setUser(result.data.user);
    }

    return result;
  },
};

// Users API (Admin only)
export const usersApi = {
  // Get all users
  getUsers: async (page = 1, pageSize = 20): Promise<ApiResult<PaginatedResponse<User>>> => {
    return apiRequest<PaginatedResponse<User>>(`/users?page=${page}&page_size=${pageSize}`);
  },

  // Get single user
  getUser: async (id: number): Promise<ApiResult<User>> => {
    return apiRequest<User>(`/users/${id}`);
  },

  // Create user
  createUser: async (data: CreateUserRequest): Promise<ApiResult<User>> => {
    return apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update user
  updateUser: async (id: number, data: UpdateUserRequest): Promise<ApiResult<User>> => {
    return apiRequest<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  deleteUser: async (id: number): Promise<ApiResult<null>> => {
    return apiRequest<null>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Reset password
  resetPassword: async (id: number, data: ResetPasswordRequest): Promise<ApiResult<null>> => {
    return apiRequest<null>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get audit logs
  getAuditLogs: async (
    page = 1,
    pageSize = 20,
    filters?: {
      user_id?: number;
      action?: string;
      resource?: string;
      start_time?: string;
      end_time?: string;
    }
  ): Promise<ApiResult<PaginatedResponse<AuditLog>>> => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });
    }

    return apiRequest<PaginatedResponse<AuditLog>>(`/users/audit-logs?${params}`);
  },
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!tokenManager.getAccessToken();
};

// Get current user from storage
export const getCurrentUser = (): User | null => {
  return tokenManager.getUser();
};