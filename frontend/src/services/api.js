const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('og_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || 'Request failed';
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (name, email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }),
  getMe: () => request('/auth/me'),

  // Email
  getEmailAccount: () => request('/email/account'),
  connectGmailImap: (email_address, app_password) => request('/email/connect-imap', {
    method: 'POST',
    body: JSON.stringify({ email_address, app_password }),
  }),
  getEmails: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/email${q ? `?${q}` : ''}`);
  },
  getEmailDetails: (id) => request(`/email/${id}`),
  updateEmailState: (id, state) => request(`/email/${id}/state`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  }),
  connectEmail: () => request('/email/connect', { method: 'POST' }),
  disconnectEmail: () => request('/email/disconnect', { method: 'POST' }),
  syncEmail: () => request('/email/sync', { method: 'POST' }),

  // Opportunities
  getOpportunities: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/opportunities${q ? `?${q}` : ''}`);
  },
  getRadar: () => request('/opportunities/radar'),
  getOpportunity: (id) => request(`/opportunities/${id}`),
  completeOpportunity: (id) => request(`/opportunities/${id}/complete`, { method: 'POST' }),
  snoozeOpportunity: (id, minutes) => request(`/opportunities/${id}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  }),
  stillNeedAction: (id) => request(`/opportunities/${id}/still-need-action`, { method: 'POST' }),
  editDeadline: (id, deadline, raw_deadline) => request(`/opportunities/${id}/deadline`, {
    method: 'PUT',
    body: JSON.stringify({ deadline, raw_deadline }),
  }),
  getGoogleCalendarUrl: (id) => request(`/opportunities/${id}/calendar/google`),
  getIcsDownloadUrl: (id) => `/api/opportunities/${id}/calendar/ics`,
  getMissedHistory: () => request('/opportunities/history'),

  // Reminders & Notifications
  getReminders: (status) => request(`/reminders${status ? `?status=${status}` : ''}`),
  triggerReminderCycle: () => request('/reminders/cycle', { method: 'POST' }),
  getNotifications: (status) => request(`/notifications${status ? `?status=${status}` : ''}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  // Settings & Privacy
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getPrivacyData: () => request('/settings/privacy'),
  purgeUserData: () => request('/settings/privacy/purge-data', { method: 'DELETE' }),
  getExportUrl: () => '/api/settings/privacy/export',

  // Demo Mode
  seedDemo: () => request('/demo/seed', { method: 'POST' }),
  fastForwardDemo: (minutes) => request('/demo/fast-forward', {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  }),
  triggerUrgentEmail: (data) => request('/demo/trigger-email', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  }),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),
};
