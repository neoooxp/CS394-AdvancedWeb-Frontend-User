const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Authenticates driver with backend AuthController (/api/auth/login).
 * @param {Object} credentials - ({ email, password, rememberMe })
 */
export async function loginDriver(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        portal: 'driver',
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Authentication failed (Server returned ${response.status})`
      );
    }

    if (data.role && data.role !== 'driver') {
      throw new Error('Access denied. Admins and non-driver users cannot log in to the driver portal.');
    }

    if (data.token) {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem('sbms_auth_token', data.token);
      storage.setItem('sbms_user', JSON.stringify(data.user || {}));
      storage.setItem('sbms_role', data.role || '');
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Unable to connect to backend server at ${API_BASE_URL}. Please verify server is running.`,
        { cause: error }
      );
    }
    throw error;
  }
}
