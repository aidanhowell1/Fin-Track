import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useRouter } from 'next/router';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
    throw new Error('Authentication required');
  }

  return response;
};

export const useAuthRedirect = () => {
  const router = useRouter();

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token && router.pathname !== '/auth/login' && router.pathname !== '/auth/register') {
      router.push('/auth/login');
    }
  };

  return checkAuth;
};