<template>
  <view class="user-management-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBackDashboard">
        <text class="back-arrow">←</text>
      </view>
      <text class="nav-title">用户管理</text>
      <view class="nav-right" @click="showAddUserModal">
        <view class="add-button">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>

    <!-- 用户类型切换 -->
    <view class="user-type-switcher">
      <view 
        v-for="(type, index) in userTypes" 
        :key="index"
        :class="['type-tab', { 'active': currentUserType === type.key }]"
        @click="switchUserType(type.key)"
      >
        <text class="tab-text">{{ type.label }}</text>
      </view>
    </view>

    <!-- 操作栏 -->
    <view class="operation-bar">
      <view class="search-container">
        <input 
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索姓名、学号或工号"
          placeholder-class="search-placeholder"
          @input="handleSearch"
        />
        <view class="search-icon">
          <text class="icon-text">🔍</text>
        </view>
      </view>
      
      <view class="import-button" @click="handleImportExcel">
        <text class="import-text">从Excel导入</text>
      </view>
    </view>

    <!-- 用户列表 -->
    <scroll-view class="user-list-container" scroll-y="true">
      <!-- 列表头部统计 -->
      <view class="list-header">
        <text class="list-stats">共 {{ filteredUsers.length }} 位{{ getCurrentUserTypeLabel() }}</text>
        <view v-if="isParticipationEditMode" class="batch-actions">
          <text class="selected-count">编辑参与中</text>
          <view class="participation-save-btn" @click="saveParticipation">
            <text class="batch-delete-text">保存</text>
          </view>
          <view class="participation-cancel-btn" @click="cancelParticipationEdit">
            <text class="batch-delete-text">取消</text>
          </view>
        </view>
        <view v-else-if="selectedUsers.length > 0" class="batch-actions">
          <text class="selected-count">已选择 {{ selectedUsers.length }} 项</text>
          <view class="batch-delete-button" @click="showBatchDeleteConfirm">
            <text class="batch-delete-text">批量删除</text>
          </view>
        </view>
        <view v-else class="edit-participation-btn" @click="enterParticipationEditMode">
          <text class="edit-participation-text">编辑参与</text>
        </view>
      </view>

      <!-- 用户列表 -->
      <view v-if="filteredUsers.length > 0" class="user-list">
        <view 
          v-for="(user, index) in filteredUsers" 
          :key="user.id" 
          class="user-item"
          @longpress="toggleUserSelection(user)"
        >
          <!-- 选择框（多选模式时显示） -->
          <view v-if="isMultiSelectMode" class="select-checkbox" @click="toggleUserSelection(user)">
            <view :class="['checkbox', { 'checked': isUserSelected(user) }]">
              <text v-if="isUserSelected(user)" class="check-mark">✓</text>
            </view>
          </view>

          <!-- 用户头像 -->
          <view class="user-avatar">
            <text class="avatar-text">{{ getUserAvatarText(user.name) }}</text>
          </view>

          <!-- 用户信息 -->
          <view class="user-info">
            <text class="user-name">{{ user.name }}</text>
            <text class="user-id">{{ currentUserType === 'phd' ? user.studentId : user.employeeId }}</text>
            <text class="user-email">{{ user.email }}</text>
            <view v-if="user.researchAreas && user.researchAreas.length > 0" class="research-areas">
              <text class="research-areas-text">{{ user.researchAreas.join('、') }}</text>
            </view>
          </view>

          <!-- 用户状态 -->
          <view class="user-status">
            <view :class="['status-dot', user.status]"></view>
            <text class="status-text">{{ getStatusText(user.status) }}</text>
          </view>

          <!-- 参与状态 -->
          <view class="participation-status">
            <view v-if="isParticipationEditMode">
              <view
                :class="['participation-checkbox', { 'checked': localParticipation[user.id] }]"
                @click="toggleUserParticipation(user)"
              >
                <text v-if="localParticipation[user.id]" class="check-mark">✓</text>
              </view>
            </view>
            <view v-else :class="['participation-badge', user.isParticipating ? 'participating' : 'not-participating']">
              <text class="participation-badge-text">{{ user.isParticipating ? '参与' : '不参与' }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view v-if="!isMultiSelectMode && !isParticipationEditMode" class="user-actions">
            <view class="action-button edit" @click="editUser(user)">
              <text class="action-icon">✏️</text>
            </view>
            <view class="action-button delete" @click="showDeleteConfirm(user)">
              <text class="action-icon">🗑️</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">👥</text>
        <text class="empty-title">{{ searchKeyword ? '未找到匹配的用户' : '暂无' + getCurrentUserTypeLabel() }}</text>
        <text class="empty-subtitle">{{ searchKeyword ? '请尝试其他搜索关键词' : '点击右上角"+"按钮添加用户' }}</text>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 添加用户模态框 -->
    <view v-if="showAddModal" class="modal-overlay" @click="hideAddModal">
      <view class="add-modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加{{ getCurrentUserTypeLabel() }}</text>
          <view class="close-button" @click="hideAddModal">
            <text class="close-text">✕</text>
          </view>
        </view>
        
        <scroll-view class="modal-body form-modal-body" scroll-y="true">
          <view class="form-group">
            <text class="form-label">姓名</text>
            <input v-model="newUser.name" class="form-input" placeholder="请输入姓名" />
          </view>
          
          <view class="form-group">
            <text class="form-label">{{ currentUserType === 'phd' ? '学号' : '工号' }}</text>
            <input v-model="newUser.id" class="form-input" :placeholder="`请输入${currentUserType === 'phd' ? '学号' : '工号'}`" />
          </view>
          
          <view class="form-group">
            <text class="form-label">邮箱</text>
            <input v-model="newUser.email" class="form-input" placeholder="请输入邮箱地址" />
          </view>
          
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">入学时间</text>
            <picker mode="date" @change="onEnrollmentDateChange">
              <view class="date-picker">
                <text class="date-text">{{ newUser.enrollmentDate || '请选择入学时间' }}</text>
              </view>
            </picker>
          </view>
          
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">主导师</text>
            <picker :range="availableTeachers" range-key="name" @change="onSupervisorChange">
              <view class="picker">
                <text class="picker-text">{{ getSupervisorDisplayName(newUser.supervisor) || '请选择主导师' }}</text>
              </view>
            </picker>
          </view>
          
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">研究方向</text>
            <view class="research-area-list">
              <view
                v-for="(area, idx) in researchAreaOptions"
                :key="area"
                :class="['research-area-tag', { selected: newUser.researchAreas.includes(area) }]"
                @click="toggleResearchArea(area)"
              >
                <text>{{ area }}</text>
              </view>
            </view>
          </view>
          
          <view v-if="currentUserType === 'teacher'" class="form-group">
            <text class="form-label">研究方向</text>
            <view class="research-area-list">
              <view
                v-for="(area, idx) in researchAreaOptions"
                :key="area"
                :class="['research-area-tag', { selected: newUser.researchAreas.includes(area) }]"
                @click="toggleResearchArea(area)"
              >
                <text>{{ area }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        
        <view class="modal-actions">
          <view class="modal-button cancel" @click="hideAddModal">
            <text class="button-text">取消</text>
          </view>
          <view class="modal-button confirm" @click="confirmAddUser">
            <text class="button-text">添加</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <view v-if="showDeleteModal" class="modal-overlay" @click="hideDeleteModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">确认删除</text>
        </view>
        <view class="modal-body">
          <text class="modal-message">
            确定要删除{{ deletingUser ? `"${deletingUser.name}"` : `${selectedUsers.length}位用户` }}吗？删除后无法恢复。
          </text>
        </view>
        <view class="modal-actions">
          <view class="modal-button cancel-button" @click="hideDeleteModal">
            <text class="button-text">取消</text>
          </view>
          <view class="modal-button danger-button" @click="confirmDelete">
            <text class="button-text">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑用户模态框 -->
    <view v-if="showEditModal" class="modal-overlay" @click="hideEditModal">
      <view class="add-modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">编辑{{ getCurrentUserTypeLabel() }}</text>
          <view class="close-button" @click="hideEditModal">
            <text class="close-text">✕</text>
          </view>
        </view>
        <scroll-view class="modal-body form-modal-body" scroll-y="true">
          <view class="form-group">
            <text class="form-label">姓名</text>
            <input v-model="editUserForm.name" class="form-input" placeholder="请输入姓名" />
          </view>
          <view class="form-group">
            <text class="form-label">{{ currentUserType === 'phd' ? '学号' : '工号' }}</text>
            <input v-model="editUserForm.id" class="form-input" :placeholder="`请输入${currentUserType === 'phd' ? '学号' : '工号'}`" />
          </view>
          <view class="form-group">
            <text class="form-label">邮箱</text>
            <input v-model="editUserForm.email" class="form-input" placeholder="请输入邮箱地址" />
          </view>
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">入学时间</text>
            <picker mode="date" @change="e => editUserForm.enrollmentDate = e.detail.value">
              <view class="date-picker">
                <text class="date-text">{{ editUserForm.enrollmentDate || '请选择入学时间' }}</text>
              </view>
            </picker>
          </view>
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">主导师</text>
            <picker :range="availableTeachers" range-key="name" @change="e => { const t = availableTeachers[e.detail.value]; editUserForm.supervisor = formatTeacherId(t.teacherId) || t.name }">
              <view class="picker">
                <text class="picker-text">{{ getSupervisorDisplayName(editUserForm.supervisor) || '请选择主导师' }}</text>
              </view>
            </picker>
          </view>
          <view v-if="currentUserType === 'phd'" class="form-group">
            <text class="form-label">研究方向</text>
            <view class="research-area-list">
              <view
                v-for="(area, idx) in researchAreaOptions"
                :key="area"
                :class="['research-area-tag', { selected: editUserForm.researchAreas.includes(area) }]"
                @click="toggleEditResearchArea(area)"
              >
                <text>{{ area }}</text>
              </view>
            </view>
          </view>
          <view v-if="currentUserType === 'teacher'" class="form-group">
            <text class="form-label">研究方向</text>
            <view class="research-area-list">
              <view
                v-for="(area, idx) in researchAreaOptions"
                :key="area"
                :class="['research-area-tag', { selected: editUserForm.researchAreas.includes(area) }]"
                @click="toggleEditResearchArea(area)"
              >
                <text>{{ area }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="modal-actions">
          <view class="modal-button cancel" @click="hideEditModal">
            <text class="button-text">取消</text>
          </view>
          <view class="modal-button confirm" @click="confirmEditUser">
            <text class="button-text">保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchUsers,
  addUser,
  updateUser,
  deleteUser,
  fetchResearchAreas,
  mapUserRecord,
  uploadStudents,
  uploadTeachers,
  updateParticipation
} from '../admin_API.js'

// 响应式数据
const currentUserType = ref('phd') // phd, teacher
const searchKeyword = ref('')
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showEditModal = ref(false)
const deletingUser = ref(null)
const selectedUsers = ref([])
const isMultiSelectMode = ref(false)

const newUser = ref({
  name: '',
  id: '',
  email: '',
  enrollmentDate: '',
  supervisor: '',
  title: '',
  researchAreas: []
})

const editingUser = ref(null)

// 参与评审编辑相关
const isParticipationEditMode = ref(false)
const localParticipation = ref({})    // { [userId]: boolean }
const originalParticipation = ref({}) // { [userId]: boolean }

const editUserForm = ref({
  name: '',
  id: '',
  email: '',
  enrollmentDate: '',
  supervisor: '',
  title: '',
  researchAreas: []
})

const userTypes = ref([
  { key: 'phd', label: '博士生' },
  { key: 'teacher', label: '老师' }
])

const availableTeachers = ref([])
const researchAreaOptions = ref([])

// 用户列表（替代原来的 phdStudents / teachers 两个独立数组）
const users = ref([])

// NOTE: 搜索已在服务端完成，filteredUsers 直接返回 users
const filteredUsers = computed(() => users.value)

const loadUsers = async () => {
  try {
    const res = await fetchUsers(searchKeyword.value, currentUserType.value, 1, 100)
    if (res && res.code === 200 && res.data) {
      const records = res.data.list || []
      users.value = Array.isArray(records)
        ? records.map(r => mapUserRecord(r, currentUserType.value))
        : []
    }
  } catch (e) {
    console.error('加载用户列表失败', e)
  }
}

const loadResearchAreaOptions = async () => {
  try {
    const res = await fetchResearchAreas('', 1, 100)
    if (res && res.code === 200 && res.data) {
      const records = res.data.list || []
      researchAreaOptions.value = Array.isArray(records) ? records.map(r => r.name) : []
    }
  } catch (e) {
    console.error('加载研究方向失败', e)
  }
}

const loadAvailableTeachers = async () => {
  try {
    const res = await fetchUsers('', 'teacher', 1, 100)
    if (res && res.code === 200 && res.data) {
      const records = res.data.list || []
      availableTeachers.value = Array.isArray(records)
        ? records.map(r => ({ id: r.id, name: r.name || '', teacherId: r.teacherId || null }))
        : []
    }
  } catch (e) {
    console.error('加载导师列表失败', e)
  }
}

// 将 teacherId 格式化为 "T001" 格式
const formatTeacherId = (teacherId) => {
  if (!teacherId) return ''
  return 'T' + String(parseInt(teacherId)).padStart(3, '0')
}

// 根据 "T001" 格式 ID 查找导师显示名称
const getSupervisorDisplayName = (supervisorId) => {
  if (!supervisorId) return ''
  const teacher = availableTeachers.value.find(t =>
    t.teacherId && formatTeacherId(t.teacherId) === supervisorId
  )
  return teacher ? teacher.name : supervisorId
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadResearchAreaOptions(), loadAvailableTeachers()])
})

// 方法定义
const switchUserType = (type) => {
  currentUserType.value = type
  searchKeyword.value = ''
  selectedUsers.value = []
  isMultiSelectMode.value = false
  loadUsers()
}

const getCurrentUserTypeLabel = () => {
  return currentUserType.value === 'phd' ? '博士生' : '老师'
}

let _searchTimer = null
const handleSearch = () => {
  clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => loadUsers(), 300)
}

const handleImportExcel = () => {
  uni.chooseFile({
    count: 1,
    extension: ['.xlsx', '.xls'],
    success: async (res) => {
      const filePath = res.tempFiles[0].path || res.tempFiles[0]
      uni.showLoading({ title: '导入中...', mask: true })
      try {
        const uploadFn = currentUserType.value === 'phd' ? uploadStudents : uploadTeachers
        const data = await uploadFn(filePath)
        uni.hideLoading()
        if (data && data.code === 200) {
          uni.showToast({ title: data.msg || '导入成功', icon: 'success' })
          await loadUsers()
        } else {
          uni.showToast({ title: data?.msg || '导入失败', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '导入失败', icon: 'none' })
      }
    }
  })
}

const getUserAvatarText = (name) => {
  return name ? name.charAt(name.length - 1) : '?'
}

const getStatusText = (status) => {
  const statusMap = {
    active: '正常',
    inactive: '停用',
    graduated: '已毕业'
  }
  return statusMap[status] || '未知'
}

const toggleUserSelection = (user) => {
  if (!isMultiSelectMode.value) {
    isMultiSelectMode.value = true
  }
  
  const index = selectedUsers.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(user)
  }
  
  if (selectedUsers.value.length === 0) {
    isMultiSelectMode.value = false
  }
}

const isUserSelected = (user) => {
  return selectedUsers.value.some(u => u.id === user.id)
}

const showAddUserModal = () => {
  newUser.value = {
    name: '',
    id: '',
    email: '',
    enrollmentDate: '',
    supervisor: '',
    title: '',
    researchAreas: []
  }
  showAddModal.value = true
}

const hideAddModal = () => {
  showAddModal.value = false
}

const onEnrollmentDateChange = (e) => {
  newUser.value.enrollmentDate = e.detail.value
}

const onSupervisorChange = (e) => {
  const index = e.detail.value
  const teacher = availableTeachers.value[index]
  newUser.value.supervisor = formatTeacherId(teacher.teacherId) || teacher.name
}

const toggleResearchArea = (area) => {
  const idx = newUser.value.researchAreas.indexOf(area)
  if (idx > -1) {
    newUser.value.researchAreas.splice(idx, 1)
  } else {
    newUser.value.researchAreas.push(area)
  }
}

const confirmAddUser = async () => {
  if (!newUser.value.name || !newUser.value.id || !newUser.value.email) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  // 构建 UserAddDTO
  // NOTE: 字段名称以后端 UserAddDTO 为准（blocker ②）
  const dto = {
    type: currentUserType.value,
    name: newUser.value.name,
    email: newUser.value.email,
    researchAreas: newUser.value.researchAreas || []
  }
  if (currentUserType.value === 'phd') {
    dto.studentId = newUser.value.id
    dto.enrollmentDate = newUser.value.enrollmentDate || null
    dto.mainSupervisor = newUser.value.supervisor || ''
    dto.supervisors = newUser.value.supervisor ? [newUser.value.supervisor] : []
  } else {
    dto.employeeId = newUser.value.id
  }

  try {
    const res = await addUser(dto)
    if (res && res.code === 200) {
      await loadUsers()
      hideAddModal()
      uni.showToast({ title: '添加成功', icon: 'success' })
    } else {
      uni.showToast({ title: res?.msg || '添加失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

const editUser = (user) => {
  editingUser.value = user
  showEditModal.value = true
  // 深拷贝用户信息到表单
  editUserForm.value = {
    name: user.name,
    id: currentUserType.value === 'phd' ? user.studentId : user.employeeId,
    email: user.email,
    enrollmentDate: user.enrollmentDate || '',
    supervisor: user.supervisor || '',
    title: user.title || '',
    researchAreas: user.researchAreas ? [...user.researchAreas] : []
  }
}

const hideEditModal = () => {
  showEditModal.value = false
  editingUser.value = null
}

const toggleEditResearchArea = (area) => {
  const idx = editUserForm.value.researchAreas.indexOf(area)
  if (idx > -1) {
    editUserForm.value.researchAreas.splice(idx, 1)
  } else {
    editUserForm.value.researchAreas.push(area)
  }
}

const confirmEditUser = async () => {
  if (!editUserForm.value.name || !editUserForm.value.id || !editUserForm.value.email) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  // 构建 UserAddDTO（同 confirmAddUser）
  const dto = {
    type: currentUserType.value,
    name: editUserForm.value.name,
    email: editUserForm.value.email,
    researchAreas: editUserForm.value.researchAreas || []
  }
  if (currentUserType.value === 'phd') {
    dto.studentId = editUserForm.value.id
    dto.enrollmentDate = editUserForm.value.enrollmentDate || null
    dto.mainSupervisor = editUserForm.value.supervisor || ''
    dto.supervisors = editUserForm.value.supervisor ? [editUserForm.value.supervisor] : []
  } else {
    dto.employeeId = editUserForm.value.id
  }

  try {
    const res = await updateUser(editingUser.value.id, dto)
    if (res && res.code === 200) {
      await loadUsers()
      hideEditModal()
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      uni.showToast({ title: res?.msg || '保存失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const showDeleteConfirm = (user) => {
  deletingUser.value = user
  showDeleteModal.value = true
}

const showBatchDeleteConfirm = () => {
  deletingUser.value = null
  showDeleteModal.value = true
}

const hideDeleteModal = () => {
  showDeleteModal.value = false
  deletingUser.value = null
}

const confirmDelete = async () => {
  try {
    if (deletingUser.value) {
      // 删除单个用户
      const res = await deleteUser(deletingUser.value.id)
      if (res && res.code === 200) {
        await loadUsers()
        hideDeleteModal()
        uni.showToast({ title: '删除成功', icon: 'success' })
      } else {
        uni.showToast({ title: res?.msg || '删除失败', icon: 'none' })
      }
    } else {
      // 批量删除
      await Promise.all(selectedUsers.value.map(u => deleteUser(u.id)))
      selectedUsers.value = []
      isMultiSelectMode.value = false
      await loadUsers()
      hideDeleteModal()
      uni.showToast({ title: '删除成功', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

const enterParticipationEditMode = () => {
  const orig = {}
  const local = {}
  users.value.forEach(u => {
    orig[u.id] = u.isParticipating
    local[u.id] = u.isParticipating
  })
  originalParticipation.value = orig
  localParticipation.value = local
  isParticipationEditMode.value = true
}

const cancelParticipationEdit = () => {
  isParticipationEditMode.value = false
  localParticipation.value = {}
  originalParticipation.value = {}
}

const toggleUserParticipation = (user) => {
  localParticipation.value[user.id] = !localParticipation.value[user.id]
}

const saveParticipation = async () => {
  const changed = Object.entries(localParticipation.value).filter(
    ([uid, val]) => val !== originalParticipation.value[uid]
  )
  if (changed.length === 0) {
    isParticipationEditMode.value = false
    return
  }
  try {
    await Promise.all(changed.map(([uid, val]) => updateParticipation(uid, val)))
    await loadUsers()
    isParticipationEditMode.value = false
    localParticipation.value = {}
    originalParticipation.value = {}
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const goBackDashboard = () => {
  uni.navigateTo({
    url: '/pages/admin/dashboard/dashboard'
  })
}
</script>

<style scoped>
.user-management-container {
  min-height: 100vh;
  background: #f2f2f7;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.nav-bar {
  height: 88rpx;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1rpx solid #e5e5e7;
}

.nav-left {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;
  cursor: pointer;
}

.back-arrow {
  font-size: 36rpx;
  color: #007AFF;
  font-weight: 600;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.nav-right {
  display: flex;
  align-items: center;
}

.add-button {
  width: 60rpx;
  height: 60rpx;
  border-radius: 16rpx;
  background: #F2F2F7;
  border: 2rpx solid #E5E5E7;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.add-button:active {
  transform: scale(0.95);
  background: #E5E5E7;
}

.add-icon {
  font-size: 38rpx;
  color: #007AFF;
  font-weight: 600;
}

/* 用户类型切换 */
.user-type-switcher {
  background: white;
  display: flex;
  border-bottom: 1rpx solid #e5e5e7;
}

.type-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx 20rpx;
  position: relative;
  transition: all 0.3s ease;
}

.type-tab.active {
  background: #F2F2F7;
}

.type-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(135deg, #007AFF, #5856D6);
}

.tab-text {
  font-size: 28rpx;
  color: #8E8E93;
  font-weight: 500;
  margin-right: 8rpx;
}

.type-tab.active .tab-text {
  color: #007AFF;
  font-weight: 600;
}

/* 操作栏 */
.operation-bar {
  background: white;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 95rpx;
  border-bottom: 1rpx solid #e5e5e7;
}

.search-container {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  height: 72rpx;
  background: #F2F2F7;
  border-radius: 16rpx;
  padding: 0 24rpx 0 56rpx;
  font-size: 28rpx;
  color: #1d1d1f;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: #007AFF;
  background: white;
}

.search-placeholder {
  color: #C7C7CC;
}

.search-icon {
  position: absolute;
  left: 15rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28rpx;
}

.icon-text {
  color: #8E8E93;
}

.import-button {
  background: linear-gradient(135deg, #34C759, #30D158);
  border-radius: 16rpx;
  padding: 18rpx 22rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  transition: all 0.3s ease;
}

.import-button:active {
  transform: scale(0.95);
}

.import-text {
  font-size: 26rpx;
  color: white;
  font-weight: 500;
}

/* 用户列表容器 */
.user-list-container {
  flex: 1;
  padding: 0 32rpx 120rpx 32rpx;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 8rpx 16rpx 8rpx;
}

.list-stats {
  font-size: 26rpx;
  color: #8E8E93;
  font-weight: 500;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selected-count {
  font-size: 24rpx;
  color: #007AFF;
  font-weight: 500;
}

.batch-delete-button {
  background: #FF3B30;
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
}

.batch-delete-text {
  font-size: 22rpx;
  color: white;
  font-weight: 500;
}

/* 用户列表 */
.user-list {
  background: white;
  border-radius: 16rpx;
  border: 1rpx solid #e5e5e7;
  overflow: hidden;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx 28rpx 32rpx;
  border-bottom: 1rpx solid #e5e5e7;
  transition: all 0.3s ease;
}

.user-item:last-child {
  border-bottom: none;
}

.user-item:active {
  background-color: rgba(0, 0, 0, 0.03);
}

.select-checkbox {
  margin-right: 20rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #C7C7CC;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.checkbox.checked {
  background: linear-gradient(135deg, #007AFF, #5856D6);
  border-color: #007AFF;
}

.check-mark {
  font-size: 24rpx;
  color: white;
  font-weight: 600;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #007AFF, #5856D6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.avatar-text {
  font-size: 32rpx;
  color: white;
  font-weight: 600;
}

.user-info {
  flex: 1;
  margin-right: 16rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: block;
  margin-bottom: 6rpx;
}

.user-id {
  font-size: 24rpx;
  color: #8E8E93;
  display: block;
  margin-bottom: 6rpx;
}

.user-email {
  font-size: 22rpx;
  color: #8E8E93;
  display: block;
  margin-bottom: 6rpx;
}

.research-areas {
  margin-top: 4rpx;
}

.research-areas-text {
  font-size: 20rpx;
  color: #007AFF;
  font-weight: 500;
  white-space: normal;
  word-break: break-all;
  display: block;
  line-height: 1.6;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-right: 16rpx;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.status-dot.active {
  background: #34C759;
}

.status-dot.inactive {
  background: #FF9500;
}

.status-dot.graduated {
  background: #8E8E93;
}

.status-text {
  font-size: 22rpx;
  color: #8E8E93;
  font-weight: 500;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-right: 8rpx;
}

.action-button {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.action-button.edit {
  background: linear-gradient(135deg, #007AFF, #5856D6);
}

.action-button.delete {
  background: linear-gradient(135deg, #FF3B30, #FF2D20);
}

.action-button:active {
  transform: scale(0.9);
}

.action-icon {
  font-size: 28rpx;
  color: white;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
  display: block;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12rpx;
  display: block;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #8E8E93;
  display: block;
}

/* 底部间距 */
.bottom-space {
  height: 40rpx;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(10rpx);
}

.modal-content {
  background: white;
  border-radius: 28rpx;
  width: 540rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

.add-modal-content {
  background: white;
  border-radius: 28rpx;
  width: 100%;
  max-width: 420px;
  min-width: 260px;
  box-sizing: border-box;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  padding: 0;
  z-index: 1000;
}

.modal-header {
  padding: 32rpx;
  border-bottom: 1rpx solid #e5e5e7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.close-button {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #F2F2F7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-text {
  font-size: 24rpx;
  color: #8E8E93;
  font-weight: 600;
}

.modal-body {
  padding: 24rpx 20rpx 24rpx 20rpx;
  text-align: center;
  box-sizing: border-box;
}

.form-modal-body {
  flex: 1;
  height: 56vh;
  min-height: 0;
}

.modal-message {
  font-size: 28rpx;
  color: #8E8E93;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 26rpx;
  color: #1d1d1f;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #F2F2F7;
  border-radius: 16rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #1d1d1f;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #007AFF;
  background: white;
}

.date-picker,
.picker {
  width: 100%;
  height: 80rpx;
  background: #F2F2F7;
  border-radius: 16rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.date-text,
.picker-text {
  font-size: 28rpx;
  color: #1d1d1f;
}

.modal-actions {
  border-top: 1rpx solid #e5e5e7;
  display: flex;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  background: white;
}

.modal-button {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  transition: background-color 0.2s ease;
}

.modal-button:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.modal-button.cancel {
  border-right: 1rpx solid #e5e5e7;
}

.cancel-button {
  border-right: 1rpx solid rgba(0, 0, 0, 0.1);
}

.button-text {
  font-size: 30rpx;
  font-weight: 500;
}

.modal-button.cancel .button-text,
.cancel-button .button-text {
  color: #8E8E93;
}

.modal-button.confirm .button-text {
  color: #007AFF;
  font-weight: 600;
}

.danger-button .button-text {
  color: #FF3B30;
  font-weight: 600;
}

.research-area-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
  padding-bottom: 32rpx;
}

.research-area-tag {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #f2f2f7;
  color: #666;
  font-size: 24rpx;
  cursor: pointer;
  border: 2rpx solid #e5e5e7;
  transition: all 0.2s;
}

.research-area-tag.selected {
  background: linear-gradient(135deg, #007AFF, #5856D6);
  color: #fff;
  border-color: #007AFF;
}

.edit-participation-btn {
  background: linear-gradient(135deg, #FF9500, #FF6B00);
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
}

.edit-participation-text {
  font-size: 22rpx;
  color: white;
  font-weight: 500;
}

.participation-save-btn {
  background: linear-gradient(135deg, #34C759, #30D158);
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
  margin-right: 8rpx;
}

.participation-cancel-btn {
  background: #8E8E93;
  border-radius: 12rpx;
  padding: 8rpx 16rpx;
}

.participation-status {
  display: flex;
  align-items: center;
  margin-right: 12rpx;
}

.participation-badge {
  border-radius: 12rpx;
  padding: 4rpx 12rpx;
}

.participation-badge.participating {
  background: #E8F8ED;
}

.participation-badge.not-participating {
  background: #F2F2F7;
}

.participation-badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.participation-badge.participating .participation-badge-text {
  color: #34C759;
}

.participation-badge.not-participating .participation-badge-text {
  color: #8E8E93;
}

.participation-checkbox {
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid #C7C7CC;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.participation-checkbox.checked {
  background: linear-gradient(135deg, #34C759, #30D158);
  border-color: #34C759;
}
</style>