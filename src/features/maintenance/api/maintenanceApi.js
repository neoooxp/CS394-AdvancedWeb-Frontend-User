import { fetchAllPages } from '../../../services/apiUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('sbms_auth_token') || sessionStorage.getItem('sbms_auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getStoredUser() {
  const userStr = localStorage.getItem('sbms_user') || sessionStorage.getItem('sbms_user');
  return userStr ? JSON.parse(userStr) : null;
}

export async function fetchMaintenanceRequests() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/maintenance/requests`, { headers });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('sbms_auth_token');
      localStorage.removeItem('sbms_user');
      sessionStorage.removeItem('sbms_auth_token');
      sessionStorage.removeItem('sbms_user');
      window.location.reload();
    }
    throw new Error('Failed to fetch maintenance requests');
  }
  return fetchAllPages(`${API_BASE_URL}/maintenance/requests`, headers);
}

export async function fetchBuses() {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/buses`, { headers });
  if (!response.ok) throw new Error('Failed to fetch buses');
  return fetchAllPages(`${API_BASE_URL}/buses`, headers);
}

export async function createMaintenanceRequest(payload) {
  const headers = getAuthHeaders();
  const user = getStoredUser();
  const driverId = user?.user_id || user?.id;

  const body = {
    ...payload,
    driver_id: Number(driverId),
    bus_id: Number(payload.bus_id),
  };

  const response = await fetch(`${API_BASE_URL}/maintenance/requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to submit maintenance request');
  }
  return data;
}
