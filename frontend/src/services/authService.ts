const API_BASE = 'http://localhost:8080/api/v1';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Token management
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// API calls
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success && result.token && result.user) {
      setToken(result.token);
      setStoredUser(result.user);
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: '网络错误，请稍后重试',
    };
  }
};

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success && result.token && result.user) {
      setToken(result.token);
      setStoredUser(result.user);
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: '网络错误，请稍后重试',
    };
  }
};

export const logout = (): void => {
  removeToken();
};

export const getMe = async (): Promise<{ success: boolean; user?: User; message?: string }> => {
  const token = getToken();
  if (!token) {
    return { success: false, message: '未登录' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const result = await response.json();
    
    if (result.success && result.user) {
      setStoredUser(result.user);
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: '网络错误，请稍后重试',
    };
  }
};

export const updateProfile = async (data: UpdateProfileRequest): Promise<{ success: boolean; user?: User; message?: string }> => {
  const token = getToken();
  if (!token) {
    return { success: false, message: '未登录' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success && result.user) {
      setStoredUser(result.user);
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: '网络错误，请稍后重试',
    };
  }
};

export const changePassword = async (data: ChangePasswordRequest): Promise<{ success: boolean; message?: string }> => {
  const token = getToken();
  if (!token) {
    return { success: false, message: '未登录' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: '网络错误，请稍后重试',
    };
  }
};
