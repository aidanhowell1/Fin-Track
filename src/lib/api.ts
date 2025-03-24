interface FetchOptions extends RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

const getToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

interface ApiError extends Error {
  status?: number;
  details?: any;
}

export const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  try {
    // Get token from localStorage
    const token = getToken();

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    // Prepare the request options
    const requestOptions: FetchOptions = {
      ...options,
      headers,
    };

    // If there's a body, stringify it
    if (requestOptions.body && typeof requestOptions.body === 'object') {
      requestOptions.body = JSON.stringify(requestOptions.body);
    }

    const response = await fetch(url, requestOptions);

    // Handle authentication error
    if (response.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
      throw new Error('Authentication required');
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};