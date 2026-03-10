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
  deleteDept: (facultyId, deptIndex) => axios.delete(`/departments/${facultyId}/${deptIndex}`),
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

export const usersAPI = {
  getDeans: () => axios.get('/users/deans'),
  getStats: () => axios.get('/users/stats'),
};
