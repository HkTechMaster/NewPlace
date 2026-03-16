import axios from 'axios';

export const skillFacultyAPI = {
  getAll: () => axios.get('/skill-faculties'),
  getById: (id) => axios.get(`/skill-faculties/${id}`),
  create: (data) => axios.post('/skill-faculties', data),
  update: (id, data) => axios.put(`/skill-faculties/${id}`, data),
  delete: (id) => axios.delete(`/skill-faculties/${id}`),
};

export const departmentAPI = {
  addDirect: (data) => axios.post('/departments/direct', data),
  editDirect: (facultyId, deptIndex, data) => axios.put(`/departments/direct/${facultyId}/${deptIndex}`, data),
  sendRequest: (data) => axios.post('/departments/request', data),
  sendEditRequest: (data) => axios.post('/departments/edit-request', data),
  getRequests: () => axios.get('/departments/requests'),
  getAllRequests: () => axios.get('/departments/requests/all'),
  approve: (id) => axios.put(`/departments/requests/${id}/approve`),
  reject: (id, reason) => axios.put(`/departments/requests/${id}/reject`, { reason }),
  getAdminHistory: () => axios.get('/departments/requests/admin-history'),
};

export const courseAPI = {
  getAll: () => axios.get('/courses'),
  create: (data) => axios.post('/courses', data),
  update: (id, data) => axios.put(`/courses/${id}`, data),
  delete: (id) => axios.delete(`/courses/${id}`),
};

export const studentAPI = {
  getPending: () => axios.get('/students/pending'),
  getAll: () => axios.get('/students'),
  getByCourse: () => axios.get('/students/by-course'),
  getById: (id) => axios.get(`/students/${id}`),
  approve: (id) => axios.put(`/students/${id}/approve`),
  reject: (id, reason) => axios.put(`/students/${id}/reject`, { reason }),
};

export const cvAPI = {
  // Student
  getMine: () => axios.get('/cv/mine'),
  create: (data) => axios.post('/cv/create', data),
  update: (id, data) => axios.put(`/cv/${id}`, data),
  submit: (id) => axios.post(`/cv/${id}/submit`),
  delete: (id) => axios.delete(`/cv/${id}`),
  dismissReminder: (id) => axios.post(`/cv/${id}/dismiss-reminder`),
  // Coordinator
  getRequests: () => axios.get('/cv/requests'),
  getStudentsList: () => axios.get('/cv/students-list'),
  getById: (id) => axios.get(`/cv/${id}`),
  verify: (id) => axios.put(`/cv/${id}/verify`),
  reject: (id, reason) => axios.put(`/cv/${id}/reject`, { reason }),
  remind: (id) => axios.post(`/cv/${id}/remind`),
};

export const usersAPI = {
  getDeans: () => axios.get('/users/deans'),
  getStats: () => axios.get('/users/stats'),
};
