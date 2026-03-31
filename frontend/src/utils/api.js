import axios from 'axios';

axios.defaults.baseURL = '/api';

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

// Staff Notifications (PO + Chairperson)
export const getStaffNotifications   = ()      => api.get('/staff-notifications');
export const markStaffNotifRead      = (id)    => api.patch(`/staff-notifications/${id}/read`);
export const markAllStaffNotifsRead  = ()      => api.patch('/staff-notifications/mark-all-read');
export const deleteStaffNotif        = (id)    => api.delete(`/staff-notifications/${id}`);
export const getChairpersonsForPO    = ()      => api.get('/staff-notifications/chairpersons');
export const sendPOMessage           = (chairpersonId, message) =>
  api.post('/staff-notifications/po-message', { chairpersonId, message });

export const studentAPI = {
  getPending: () => axios.get('/students/pending'),
  getAll: () => axios.get('/students'),
  getByCourse: () => axios.get('/students/by-course'),
  getById: (id) => axios.get(`/students/${id}`),
  approve: (id) => axios.put(`/students/${id}/approve`),
  reject: (id, reason) => axios.put(`/students/${id}/reject`, { reason }),
};

export const cvAPI = {
  getMine: () => axios.get('/cv/mine'),
  create: (data) => axios.post('/cv/create', data),
  update: (id, data) => axios.put(`/cv/${id}`, data),
  submit: (id) => axios.post(`/cv/${id}/submit`),
  delete: (id) => axios.delete(`/cv/${id}`),
  dismissReminder: (id) => axios.post(`/cv/${id}/dismiss-reminder`),
  getRequests: () => axios.get('/cv/requests'),
  getStudentsList: () => axios.get('/cv/students-list'),
  getById: (id) => axios.get(`/cv/${id}`),
  getVerifiedByStudent: (studentId) => axios.get(`/cv/student-verified/${studentId}`),
  verify: (id) => axios.put(`/cv/${id}/verify`),
  reject: (id, reason) => axios.put(`/cv/${id}/reject`, { reason }),
  remind: (id) => axios.post(`/cv/${id}/remind`),
};

export const studentListAPI = {
  getMine: () => axios.get('/student-lists/mine'),
  create: (data) => axios.post('/student-lists/create', data),
  resend: (id, data) => axios.put(`/student-lists/${id}/resend`, data),
  delete: (id) => axios.delete(`/student-lists/${id}`),
  getInbox: () => axios.get('/student-lists/inbox'),
  getById: (id) => axios.get(`/student-lists/${id}`),
  approve: (id) => axios.put(`/student-lists/${id}/approve`),
  reject: (id, reason) => axios.put(`/student-lists/${id}/reject`, { reason }),
  removeFromInbox: (id) => axios.put(`/student-lists/${id}/remove-inbox`),
  getApproved: () => axios.get('/student-lists/approved'),
};

export const jobAPI = {
  getAll: () => axios.get('/jobs'),
  getEligible: () => axios.get('/jobs/eligible'),
  create: (data) => axios.post('/jobs', data),
  update: (id, data) => axios.put(`/jobs/${id}`, data),
  delete: (id) => axios.delete(`/jobs/${id}`),
  getEligibleStudents: (id) => axios.get(`/jobs/${id}/eligible-students`),
  getApplicants: (id) => axios.get(`/jobs/${id}/applicants`),
  apply: (id, data) => axios.post(`/jobs/${id}/apply`, data),
  updateApplicantStatus: (jobId, studentId, status) => axios.put(`/jobs/${jobId}/applicants/${studentId}/status`, { status }),
  addStudent: (id, studentId) => axios.post(`/jobs/${id}/add-student`, { studentId }),
  remind: (id) => axios.post(`/jobs/${id}/remind`),
};

export const driveAPI = {
  getAll: () => axios.get('/drives'),
  getMine: () => axios.get('/drives/mine'),
  getById: (id) => axios.get(`/drives/${id}`),
  create: (data) => axios.post('/drives', data),
  addRound: (id, data) => axios.post(`/drives/${id}/rounds`, data),
  saveAttendance: (id, roundId, data) => axios.put(`/drives/${id}/rounds/${roundId}/attendance`, data),
  saveResults: (id, roundId, data) => axios.put(`/drives/${id}/rounds/${roundId}/results`, data),
  uploadOffer: (id, studentId, data) => axios.put(`/drives/${id}/offer-letter/${studentId}`, data),
  getReport: (id) => axios.get(`/drives/${id}/report`),
};

export const placementOfficerAPI = {
  getAll: () => axios.get('/users/placement-officers'),
  create: (data) => axios.post('/users/placement-officers', data),
  delete: (id) => axios.delete(`/users/placement-officers/${id}`),
};

export const usersAPI = {
  getDeans: () => axios.get('/users/deans'),
  getStats: () => axios.get('/users/stats'),
};

export const notificationAPI = {
  getAll: () => axios.get('/notifications'),
  markRead: (id) => axios.put(`/notifications/${id}/read`),
  markAllRead: () => axios.put('/notifications/mark-all-read'),
  delete: (id) => axios.delete(`/notifications/${id}`),
};
