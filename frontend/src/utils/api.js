import axios from 'axios';

export const skillFacultyAPI = {
  getAll: () => axios.get('/skill-faculties'),
  getById: (id) => axios.get(`/skill-faculties/${id}`),
  create: (data) => axios.post('/skill-faculties', data),
  update: (id, data) => axios.put(`/skill-faculties/${id}`, data),
  delete: (id) => axios.delete(`/skill-faculties/${id}`),
};

export const departmentAPI = {
  // Dean adds directly
  addDirect: (data) => axios.post('/departments/direct', data),
  // Super admin sends request to dean
  sendRequest: (data) => axios.post('/departments/request', data),
  // Dean fetches requests for their faculty
  getRequests: () => axios.get('/departments/requests'),
  // Super admin sees all sent requests
  getAllRequests: () => axios.get('/departments/requests/all'),
  // Dean approves
  approve: (id) => axios.put(`/departments/requests/${id}/approve`),
  // Dean rejects
  reject: (id, reason) => axios.put(`/departments/requests/${id}/reject`, { reason }),
  // Dean deletes dept
  deleteDept: (facultyId, deptIndex) => axios.delete(`/departments/${facultyId}/${deptIndex}`),
};

export const courseAPI = {
  getAll: () => axios.get('/courses'),
  create: (data) => axios.post('/courses', data),
  update: (id, data) => axios.put(`/courses/${id}`, data),
  delete: (id) => axios.delete(`/courses/${id}`),
};

export const usersAPI = {
  getDeans: () => axios.get('/users/deans'),
  getStats: () => axios.get('/users/stats'),
  toggleStatus: (id) => axios.put(`/users/${id}/toggle-status`),
};
