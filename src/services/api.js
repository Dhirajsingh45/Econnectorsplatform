import axios from 'axios';

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    if (import.meta.env.PROD) {
      console.error('❌ CONFIGURATION ERROR: VITE_API_URL is missing from production environment settings.');
    }
    return 'http://localhost:5000/api';
  }
  return url;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const saved = localStorage.getItem('Ecoconnect_user');
    if (saved) {
      try {
        const { token } = JSON.parse(saved);
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch (_) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const enhanced = new Error('Cannot reach the server. Make sure the backend is running.');
      enhanced.code = 'NETWORK_ERROR';
      return Promise.reject(enhanced);
    }

    const { status, data } = error.response;
    let message = data?.message || 'Something went wrong.';
    let code = data?.code || 'UNKNOWN';

    if (status === 401) {
      message = 'Authentication expired. Please log in again.';
      code = 'AUTH_EXPIRED';
      localStorage.removeItem('Ecoconnect_user');
    } else if (status === 403) {
      message = data?.message || 'You do not have permission to perform this action.';
      code = 'FORBIDDEN';
    } else if (status === 404) {
      message = 'Resource not found.';
      code = 'NOT_FOUND';
    } else if (status === 503) {
      message = 'Database unavailable. Please try again in a moment.';
      code = 'DB_UNAVAILABLE';
    }

    const enhanced = new Error(message);
    enhanced.code = code;
    enhanced.status = status;
    return Promise.reject(enhanced);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (payload) => {
    const response = await api.put('/auth/profile', payload);
    return response.data;
  },
  requestVerification: async (payload) => {
    const response = await api.post('/auth/verify-request', payload);
    return response.data;
  },
};

export const reportService = {
  create: async (reportData) => {
    const response = await api.post('/reports', reportData);
    return response.data;
  },
  triage: async (payload) => {
    const response = await api.post('/reports/triage', payload);
    return response.data;
  },
  checkDuplicates: async (payload) => {
    const response = await api.post('/reports/check-duplicates', payload);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/reports');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/reports/stats');
    return response.data;
  },
};

export const taskService = {
  getAll: async () => {
    const response = await api.get('/reports/tasks');
    return response.data;
  },
  update: async (id, status) => {
    const response = await api.put(`/reports/tasks/${id}`, { status });
    return response.data;
  },
  updateWithPayload: async (id, payload) => {
    const response = await api.put(`/reports/tasks/${id}`, payload);
    return response.data;
  },
  escalate: async (id) => {
    const response = await api.post(`/reports/tasks/${id}/escalate`);
    return response.data;
  },
  addMessage: async (id, payload) => {
    const response = await api.post(`/reports/tasks/${id}/messages`, payload);
    return response.data;
  },
  verify: async (id) => {
    const response = await api.put(`/reports/tasks/${id}/verify`);
    return response.data;
  },
  updateChecklist: async (id, checklist) => {
    const response = await api.put(`/reports/tasks/${id}/checklist`, { checklist });
    return response.data;
  },
};

export const dispatchService = {
  getEligible: async (taskId) => {
    const response = await api.get(`/dispatch/eligible/${taskId}`);
    return response.data;
  },
  initiate: async (taskId, slaSeconds = 900) => {
    const response = await api.post(`/dispatch/initiate/${taskId}`, { slaSeconds });
    return response.data;
  },
  accept: async (taskId) => {
    const response = await api.post(`/dispatch/accept/${taskId}`);
    return response.data;
  },
};

export const animalService = {
  getAll: async (params = {}) => {
    const response = await api.get('/animals', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/animals/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/animals', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/animals/${id}`, data);
    return response.data;
  },
  addVaccination: async (id, data) => {
    const response = await api.post(`/animals/${id}/vaccinations`, data);
    return response.data;
  },
  matchPhoto: async (imageBase64, species) => {
    const response = await api.post('/animals/match-photo', { imageBase64, species });
    return response.data;
  },
  getPassport: async (id) => {
    const response = await api.get(`/animals/passport/${id}`);
    return response.data;
  },
};

export const vetService = {
  getAll: async (params = {}) => {
    const response = await api.get('/vet', { params });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/vet/stats');
    return response.data;
  },
  getByAnimal: async (animalId) => {
    const response = await api.get(`/vet/animal/${animalId}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/vet/${id}`);
    return response.data;
  },
  createRecord: async (data) => {
    const response = await api.post('/vet', data);
    return response.data;
  },
  updateRecord: async (id, data) => {
    const response = await api.put(`/vet/${id}`, data);
    return response.data;
  },
};

export const shelterService = {
  getShelters: async () => {
    const response = await api.get('/shelter/shelters');
    return response.data;
  },
  createShelter: async (data) => {
    const response = await api.post('/shelter/shelters', data);
    return response.data;
  },
  getAssets: async (params = {}) => {
    const response = await api.get('/shelter/assets', { params });
    return response.data;
  },
  createAsset: async (data) => {
    const response = await api.post('/shelter/assets', data);
    return response.data;
  },
  updateAsset: async (id, data) => {
    const response = await api.put(`/shelter/assets/${id}`, data);
    return response.data;
  },
};

export const adoptionService = {
  getApplications: async () => {
    const response = await api.get('/adoptions');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/adoptions/stats');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/adoptions/${id}`);
    return response.data;
  },
  submit: async (data) => {
    const response = await api.post('/adoptions', data);
    return response.data;
  },
  review: async (id, data) => {
    const response = await api.put(`/adoptions/${id}/review`, data);
    return response.data;
  },
  cancel: async (id) => {
    const response = await api.delete(`/adoptions/${id}/cancel`);
    return response.data;
  },
};

export const donationService = {
  getDonations: async () => {
    const response = await api.get('/donations');
    return response.data;
  },
  createDonation: async (data) => {
    const response = await api.post('/donations', data);
    return response.data;
  },
};

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  verifyUser: async (userId, data) => {
    const response = await api.put(`/admin/users/${userId}/verify`, data);
    return response.data;
  },
  getAuditLogs: async () => {
    const response = await api.get('/admin/audit-logs');
    return response.data;
  },
  getDuplicates: async () => {
    const response = await api.get('/admin/duplicates');
    return response.data;
  },
  resetDemo: async (demoSessionId) => {
    const response = await api.delete('/admin/demo/reset', { data: { demoSessionId } });
    return response.data;
  },
};

export const sightingService = {
  create: async (data) => {
    const response = await api.post('/sightings', data);
    return response.data;
  },
  getByAnimal: async (animalId) => {
    const response = await api.get(`/sightings/animal/${animalId}`);
    return response.data;
  },
};

export const fosterService = {
  getStats: async () => {
    const response = await api.get('/foster/stats');
    return response.data;
  },
  getAnimals: async (params = {}) => {
    const response = await api.get('/foster/animals', { params });
    return response.data;
  },
  getAnimalDetail: async (animalId) => {
    const response = await api.get(`/foster/animals/${animalId}`);
    return response.data;
  },
  getApplications: async () => {
    const response = await api.get('/foster');
    return response.data;
  },
  getMyPlacements: async () => {
    const response = await api.get('/foster/my-placements');
    return response.data;
  },
  submit: async (data) => {
    const response = await api.post('/foster', data);
    return response.data;
  },
  review: async (id, data) => {
    const response = await api.put(`/foster/${id}/review`, data);
    return response.data;
  },
  checkIn: async (id, data) => {
    const response = await api.post(`/foster/${id}/check-in`, data);
    return response.data;
  },
  reportEmergency: async (id, data) => {
    const response = await api.post(`/foster/${id}/emergency`, data);
    return response.data;
  },
  fosterToAdopt: async (id, data = {}) => {
    const response = await api.post(`/foster/${id}/foster-to-adopt`, data);
    return response.data;
  },
};

export const lostFoundService = {
  getReports: async (params = {}) => {
    const response = await api.get('/lost-found', { params });
    return response.data;
  },
  getReportById: async (id) => {
    const response = await api.get(`/lost-found/${id}`);
    return response.data;
  },
  createReport: async (data) => {
    const response = await api.post('/lost-found', data);
    return response.data;
  },
  findMatches: async (id) => {
    const response = await api.get(`/lost-found/${id}/matches`);
    return response.data;
  },
  convertToRescue: async (id) => {
    const response = await api.post(`/lost-found/${id}/convert-to-rescue`);
    return response.data;
  },
  recordReunion: async (id, data) => {
    const response = await api.post(`/lost-found/${id}/reunion`, data);
    return response.data;
  },
};

export const trainingService = {
  getModules: async () => {
    const response = await api.get('/training/modules');
    return response.data;
  },
  getModuleDetail: async (id) => {
    const response = await api.get(`/training/modules/${id}`);
    return response.data;
  },
  completeLesson: async (id, lessonId) => {
    const response = await api.post(`/training/modules/${id}/progress`, { lessonId });
    return response.data;
  },
  submitQuiz: async (id, answers) => {
    const response = await api.post(`/training/modules/${id}/submit-quiz`, { answers });
    return response.data;
  },
  getMyCertificates: async () => {
    const response = await api.get('/training/certificates');
    return response.data;
  },
  verifyCertificate: async (certId) => {
    const response = await api.get(`/training/certificates/verify/${certId}`);
    return response.data;
  },
};

export const abcService = {
  getCampaigns: async () => {
    const response = await api.get('/abc');
    return response.data;
  },
  createCampaign: async (data) => {
    const response = await api.post('/abc', data);
    return response.data;
  },
  processAnimal: async (campaignId, data) => {
    const response = await api.post(`/abc/${campaignId}/process`, data);
    return response.data;
  },
};

export const publicService = {
  getStats: async () => {
    const response = await api.get('/public/stats');
    return response.data;
  },
  getHotspots: async () => {
    const response = await api.get('/public/hotspots');
    return response.data;
  },
  getMunicipal: async () => {
    const response = await api.get('/public/municipal');
    return response.data;
  },
  getMunicipalOverview: async () => {
    const response = await api.get('/public/municipal');
    return response.data;
  },
};

export const ecosystemService = {
  getNodes: async (params = {}) => {
    const response = await api.get('/ecosystem/nodes', { params });
    return response.data;
  },
  createNode: async (nodeData) => {
    const response = await api.post('/ecosystem/nodes', nodeData);
    return response.data;
  },
  getLogs: async (q = '') => {
    const response = await api.get('/ecosystem/logs', { params: q ? { q } : {} });
    return response.data;
  },
  getCredits: async () => {
    const response = await api.get('/ecosystem/credits');
    return response.data;
  },
  getLeaderboard: async (params = {}) => {
    const response = await api.get('/ecosystem/leaderboard', { params });
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get('/ecosystem/settings');
    return response.data;
  },
  updateSettings: async (settings) => {
    const response = await api.put('/ecosystem/settings', settings);
    return response.data;
  },
};

export const notificationService = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },
  deleteOne: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default api;
