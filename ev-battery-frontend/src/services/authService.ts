import api from './api';
import { setToken, removeToken } from '../utils/tokenUtils';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export const authService = {
  // User registration
  register: async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', credentials);
    return response.data;
  },

  // Email/password login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // Store token after successful login
  saveToken: (token: string): void => {
    if (!token || token === 'undefined' || token === 'null') {
      console.error('Invalid token received:', token);
      return;
    }
    setToken(token);
  },

  // Logout - remove token
  logout: (): void => {
    removeToken();
  },

  // Redirect to Google OAuth
  redirectToGoogleLogin: (): void => {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  },
};
