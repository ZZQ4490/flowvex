import { create } from 'zustand';
import {
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe as apiGetMe,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  getToken,
  getStoredUser,
} from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateProfile: (data: UpdateProfileRequest) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<{ success: boolean; message?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  isAuthenticated: !!getToken(),
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    
    const result = await apiLogin(data);
    
    if (result.success && result.user) {
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        isLoading: false,
        error: result.message || '登录失败',
      });
      return false;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    
    const result = await apiRegister(data);
    
    if (result.success && result.user) {
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        isLoading: false,
        error: result.message || '注册失败',
      });
      return false;
    }
  },

  logout: () => {
    apiLogout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return false;
    }

    set({ isLoading: true });
    
    const result = await apiGetMe();
    
    if (result.success && result.user) {
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } else {
      apiLogout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  updateProfile: async (data: UpdateProfileRequest) => {
    set({ isLoading: true, error: null });
    
    const result = await apiUpdateProfile(data);
    
    if (result.success && result.user) {
      set({
        user: result.user,
        isLoading: false,
      });
      return true;
    } else {
      set({
        isLoading: false,
        error: result.message || '更新失败',
      });
      return false;
    }
  },

  changePassword: async (data: ChangePasswordRequest) => {
    set({ isLoading: true, error: null });
    
    const result = await apiChangePassword(data);
    
    set({ isLoading: false });
    
    if (!result.success) {
      set({ error: result.message || '修改密码失败' });
    }
    
    return result;
  },

  clearError: () => {
    set({ error: null });
  },
}));
