import { request } from '../../utils/request.js';
import BASE_URL from '../../utils/apiConfig.js';

// ===================== 1. Dashboard Stats =====================

/**
 * 获取管理员控制台统计信息
 * @returns {Promise<{totalPhds, totalTeachers, confirmedTeachers, pendingTeachers,
 *   totalSchedules, totalTimeSlots, pendingResearchAreaApprovals}>}
 */
export const fetchDashboardStats = () =>
  request({ url: '/api/admin/dashboard/stats', method: 'GET' });

// ===================== 2. Date / Time Slot Config =====================

/**
 * 获取所有时间段配置
 * @returns {Promise<Array<{id, startTime, endTime, isActive}>>}
 */
export const fetchDateConfigs = () =>
  request({ url: '/api/admin/date-configs', method: 'GET' });

/**
 * 更新时间段配置（覆盖写入）
 * @param {string} academicYear - 学年，如 "2026"
 * @param {Array<{startTime, endTime}>} slots - ISO datetime 格式的时间段列表
 * @returns {Promise}
 */
export const updateDateConfigs = (academicYear, slots) =>
  request({
    url: '/api/admin/date-configs',
    method: 'POST',
    data: { academicYear, slots }
  });

// ===================== 3. User Management =====================

/**
 * 分页查询用户列表
 * @param {string} keyword - 搜索关键词
 * @param {string} type - 用户类型 'phd' | 'teacher'
 * @param {number} page - 页码
 * @param {number} size - 每页数量
 * @returns {Promise<PageResult>}
 */
export const fetchUsers = (keyword = '', type = '', page = 1, size = 100) =>
  request({
    url: `/api/admin/users?keyword=${encodeURIComponent(keyword)}&type=${type}&page=${page}&size=${size}`,
    method: 'GET'
  });

/**
 * 添加用户（博士生或老师）
 * @param {object} userDTO - UserAddDTO
 * @returns {Promise<UserAddResponseVO>}
 */
export const addUser = (userDTO) =>
  request({ url: '/api/admin/users', method: 'POST', data: userDTO });

/**
 * 更新用户信息
 * @param {number|string} userId
 * @param {object} userDTO - UserAddDTO
 * @returns {Promise}
 */
export const updateUser = (userId, userDTO) =>
  request({ url: `/api/admin/users/${userId}`, method: 'PUT', data: userDTO });

/**
 * 永久删除用户
 * @param {number|string} userId
 * @returns {Promise}
 */
export const deleteUser = (userId) =>
  request({ url: `/api/admin/users/${userId}`, method: 'DELETE' });

/**
 * 禁用用户（软删除）
 * @param {number|string} userId
 * @returns {Promise}
 */
export const disableUser = (userId) =>
  request({ url: `/api/admin/users/disable/${userId}`, method: 'DELETE' });

/**
 * 启用用户
 * @param {number|string} userId
 * @returns {Promise}
 */
export const enableUser = (userId) =>
  request({ url: `/api/admin/users/enable/${userId}`, method: 'PUT' });

/**
 * 更新用户参与本次评审状态
 * @param {number|string} userId
 * @param {boolean} participating
 * @returns {Promise}
 */
export const updateParticipation = (userId, participating) =>
  request({ url: `/api/admin/users/${userId}/participation`, method: 'PUT', data: { participating } });

// ===================== 4. Research Area Management =====================

/**
 * 分页查询研究方向列表
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<PageResult>}
 */
export const fetchResearchAreas = (keyword = '', page = 1, size = 100) =>
  request({
    url: `/api/admin/research-areas?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`,
    method: 'GET'
  });

/**
 * 获取待审核研究方向列表
 * @param {string} keyword
 * @returns {Promise<Array<PendingResearchAreaVO>>}
 */
export const fetchPendingResearchAreas = (keyword = '') =>
  request({
    url: `/api/admin/research-areas/pending?keyword=${encodeURIComponent(keyword)}`,
    method: 'GET'
  });

/**
 * 添加研究方向
 * @param {object} areaData - ResearchAreaDetail: { name, status?, createdAt? }
 * @returns {Promise}
 */
export const addResearchArea = (areaData) =>
  request({ url: '/api/admin/research-areas', method: 'POST', data: areaData });

/**
 * 更新研究方向名称
 * @param {number|string} areaId
 * @param {object} updateDTO - ResearchAreaUpdateDTO: { name }
 * @returns {Promise}
 */
export const updateResearchArea = (areaId, updateDTO) =>
  request({ url: `/api/admin/research-areas/${areaId}`, method: 'PUT', data: updateDTO });

/**
 * 删除研究方向
 * @param {number|string} areaId
 * @returns {Promise}
 */
export const deleteResearchArea = (areaId) =>
  request({ url: `/api/admin/research-areas/${areaId}`, method: 'DELETE' });

/**
 * 审核研究方向申请（通过或拒绝）
 * NOTE: ResearchAreaReviewDTO 结构待后端确认，当前猜测为 { action, reason }
 * @param {number|string} areaId
 * @param {object} reviewDTO - { action: 'approved'|'rejected', reason?: string }
 * @returns {Promise<ReviewResultVO>}
 */
export const reviewResearchArea = (areaId, reviewDTO) =>
  request({
    url: `/api/admin/research-areas/${areaId}/review`,
    method: 'PUT',
    data: reviewDTO
  });

// ===================== 5. Student / Teacher Import =====================

/**
 * 手动添加单个博士生
 * @param {object} studentDTO - StudentImportDTO
 * @returns {Promise}
 */
export const addStudent = (studentDTO) =>
  request({ url: '/api/admin/addstudent', method: 'POST', data: studentDTO });

/**
 * 批量导入博士生（Excel，multipart/form-data）
 * NOTE: 使用 uni.uploadFile，与 request() 的 JSON 上传不同
 * @param {string} filePath - uni.chooseFile 返回的临时路径
 * @returns {Promise}
 */
export const uploadStudents = (filePath) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.uploadFile({
      url: BASE_URL + '/api/admin/importstudent',
      filePath: filePath,
      name: 'file',
      header: { Authorization: token ? `Bearer ${token}` : '' },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      }
    });
  });
};

/**
 * 批量导入老师（Excel，multipart/form-data）
 * @param {string} filePath
 * @returns {Promise}
 */
export const uploadTeachers = (filePath) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.uploadFile({
      url: BASE_URL + '/api/admin/importteacher',
      filePath: filePath,
      name: 'file',
      header: { Authorization: token ? `Bearer ${token}` : '' },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve(data);
        } catch (e) {
          resolve(res.data);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '上传失败', icon: 'none' });
        reject(err);
      }
    });
  });
};

// ===================== 数据转换工具 =====================

/**
 * 将后端 TimeSlots 列表转换为前端日程列表格式
 * 后端: [{id, startTime: "2025-06-27T09:00:00", endTime: "2025-06-27T12:00:00", isActive}]
 * 前端: [{id, date: "2025-06-27", morning: "09:00-12:00", afternoon: "14:00-17:00", slotIds: []}]
 * @param {Array} slots
 * @returns {Array}
 */
export function slotsToScheduleList(slots) {
  if (!slots || !Array.isArray(slots)) return [];
  const byDate = {};
  slots.forEach(slot => {
    const startStr = slot.startTime;
    const endStr = slot.endTime;
    if (!startStr || !endStr) return;
    // 兼容 "2025-06-27T09:00:00" 和 "2025-06-27 09:00:00" 格式
    const date = startStr.substring(0, 10);
    const start = startStr.substring(11, 16);
    const end = endStr.substring(11, 16);
    const range = `${start}-${end}`;
    const hour = parseInt(start.split(':')[0], 10);
    if (!byDate[date]) {
      byDate[date] = { id: slot.id, date, morning: '', afternoon: '', slotIds: [] };
    }
    byDate[date].slotIds.push(slot.id);
    if (hour < 13) {
      byDate[date].morning = range;
    } else {
      byDate[date].afternoon = range;
    }
  });
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 将前端日程列表转换为后端 POST /api/admin/date-configs 所需格式
 * @param {Array} scheduleList - 前端日程列表
 * @param {string} academicYear - 学年，如 "2026"
 * @returns {{ academicYear: string, Slots: Array<{startTime, endTime}> }}
 */
export function scheduleListToSlots(scheduleList, academicYear) {
  const slots = [];
  scheduleList.forEach(row => {
    if (row.morning && row.morning.includes('-')) {
      const [ms, me] = row.morning.split('-');
      slots.push({ startTime: `${row.date}T${ms}:00`, endTime: `${row.date}T${me}:00` });
    }
    if (row.afternoon && row.afternoon.includes('-')) {
      const [as, ae] = row.afternoon.split('-');
      slots.push({ startTime: `${row.date}T${as}:00`, endTime: `${row.date}T${ae}:00` });
    }
  });
  return { academicYear, slots };
}

/**
 * 将后端用户记录标准化为前端所需格式
 * NOTE: 后端 PageResult.records 字段名待确认，当前为最合理猜测
 * @param {object} record - 后端返回的用户记录
 * @param {string} type - 'phd' | 'teacher'
 * @returns {object}
 */
export function mapUserRecord(record, type) {
  return {
    id: record.id || record.userId,
    name: record.name || record.username || '',
    email: record.email || '',
    status: record.status || 'active',
    // PhD 字段
    studentId: record.studentId || '',
    enrollmentDate: record.enrollmentDate || record.startDate || '',
    supervisor: record.mainSupervisor || '',
    supervisors: record.supervisors || [],
    // Teacher 字段
    employeeId: record.teacherId ? String(record.teacherId) : '',
    isConfirmed: record.isConfirmed,
    title: record.title || '',
    department: record.department || '',
    // 通用
    researchAreas: record.researchAreas || [],
    isParticipating: type === 'teacher'
      ? !!(record.isConfirmed)
      : (record.isParticipatingReview !== 0 && record.isParticipatingReview !== false && record.isParticipatingReview !== null && record.isParticipatingReview !== undefined),
  };
}

// ===================== 6. Notification Management =====================

/**
 * 获取通知列表（管理员视角）
 */
export const fetchAdminNotifications = (status = '', keyword = '', page = 1, size = 10) =>
  request({
    url: `/api/admin/notifications?status=${encodeURIComponent(status)}&keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`,
    method: 'GET'
  });

/**
 * 创建通知
 * @param {{ title, content, recipientType, sendType, scheduleTime }} dto
 */
export const createAdminNotification = (dto) =>
  request({ url: '/api/admin/notifications', method: 'POST', data: dto });

/**
 * 更新通知
 */
export const updateAdminNotification = (id, dto) =>
  request({ url: `/api/admin/notifications/${id}`, method: 'PUT', data: dto });

/**
 * 删除通知
 */
export const deleteAdminNotification = (id) =>
  request({ url: `/api/admin/notifications/${id}`, method: 'DELETE' });

/**
 * 发送通知
 */
export const sendAdminNotification = (id) =>
  request({ url: `/api/admin/notifications/${id}/send`, method: 'POST' });

// ===================== 命名空间导出（向后兼容） =====================

export const adminDashboardAPI = {
  getStats: fetchDashboardStats
};

export const adminConfigAPI = {
  getConfigs: fetchDateConfigs,
  updateConfigs: updateDateConfigs
};

export const adminUsersAPI = {
  getUsers: fetchUsers,
  addUser,
  updateUser,
  deleteUser,
  disableUser,
  enableUser
};

export const adminResearchAPI = {
  getAreas: fetchResearchAreas,
  getPending: fetchPendingResearchAreas,
  addArea: addResearchArea,
  updateArea: updateResearchArea,
  deleteArea: deleteResearchArea,
  reviewArea: reviewResearchArea
};
