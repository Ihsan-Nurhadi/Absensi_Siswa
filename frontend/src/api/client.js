import axios from 'axios';

const API_BASE_URL = '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/report/')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username, password) => {
    const res = await client.post('/auth/login/', { username, password });
    return res.data;
  },
};

export const adminAPI = {
  getTeachers: async () => (await client.get('/users/?role=WALI_KELAS')).data,
  createTeacher: async (data) => (await client.post('/users/', { ...data, role: 'WALI_KELAS' })).data,
  updateTeacher: async (id, data) => (await client.patch(`/users/${id}/`, data)).data,
  resetTeacherPassword: async (id, new_password) => (await client.post(`/users/${id}/reset_password/`, { new_password })).data,
  
  getClasses: async () => (await client.get('/classes/')).data,
  createClass: async (data) => (await client.post('/classes/', data)).data,
  updateClass: async (id, data) => (await client.patch(`/classes/${id}/`, data)).data,
  getClassDetail: async (id, bulan, tahun) => (await client.get(`/admin/classes/${id}/detail/`, { params: { bulan, tahun } })).data,

  getMqttConfig: async () => (await client.get('/mqtt/config/')).data,
  updateMqttConfig: async (data) => (await client.post('/mqtt/config/', data)).data,
};

export const teacherAPI = {
  getStudents: async () => (await client.get('/students/')).data,
  createStudent: async (data) => (await client.post('/students/', data)).data,
  updateStudent: async (id, data) => (await client.patch(`/students/${id}/`, data)).data,
  deleteStudent: async (id) => (await client.delete(`/students/${id}/`)).data,

  getClassInfo: async (classId) => (await client.get(`/classes/${classId}/`)).data,
  updateClassSchedule: async (classId, data) => (await client.patch(`/classes/${classId}/`, data)).data,

  getAttendanceToday: async () => (await client.get('/attendance/today_summary/')).data,
  getAttendanceList: async (params) => (await client.get('/attendance/', { params })).data,
  manualMarkAttendance: async (data) => (await client.post('/attendance/manual_mark/', data)).data,
  autoMarkAlfa: async (data = {}) => (await client.post('/attendance/auto_mark_alfa/', data)).data,

  getFeedbackList: async (siswa_id) => (await client.get('/feedback/', { params: { siswa_id } })).data,
  createFeedback: async (data) => (await client.post('/feedback/', data)).data,

  getPerformance: async (bulan, tahun) => (await client.get('/performance/teacher/', { params: { bulan, tahun } })).data,

  generateParentToken: async (siswa_id, bulan, tahun) => (await client.post('/report/token/generate/', { siswa_id, bulan, tahun })).data,
  
  downloadClassReportExcel: async (kelas_id, bulan, tahun) => {
    const response = await client.get('/export/report/', {
      params: { kelas_id, bulan, tahun },
      responseType: 'blob',
    });
    return response.data;
  },

  downloadStudentPDF: async (siswa_id, bulan, tahun) => {
    const response = await client.get('/report/student-pdf/', {
      params: { siswa_id, bulan, tahun },
      responseType: 'blob',
    });
    return response.data;
  },

  triggerAutoReport: async (kelas_id, force = true) => (await client.post('/report/auto/trigger/', { kelas_id, force })).data,
};

export const publicAPI = {
  getParentReport: async (token) => (await client.get(`/public/report/${token}/`)).data,
  getReportPdfUrl: (token) => `/api/report/pdf/${token}/`,
};

export const simulatorAPI = {
  scanCard: async (epc_tag, scan_type = 'AUTO', sim_time = '') => (await client.post('/simulator/scan/', { epc_tag, scan_type, sim_time })).data,
};

export default client;
