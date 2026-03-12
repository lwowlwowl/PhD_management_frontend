<template>
  <view class="notification-management">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="back-arrow">←</text>
      </view>
      <view class="nav-title">通知管理</view>
      <view class="nav-action" @click="showCreateModal">
        <uni-icons type="plus" size="20" color="#007aff"></uni-icons>
      </view>
    </view>

    <!-- 筛选和搜索 -->
    <view class="filter-section">
      <view class="filter-tabs">
        <view 
          class="filter-tab" 
          :class="{ active: activeTab === 'all' }"
          @click="switchTab('all')"
        >
          全部
        </view>
        <view 
          class="filter-tab" 
          :class="{ active: activeTab === 'draft' }"
          @click="switchTab('draft')"
        >
          草稿
        </view>
        <view 
          class="filter-tab" 
          :class="{ active: activeTab === 'sent' }"
          @click="switchTab('sent')"
        >
          已发送
        </view>
      </view>
      
      <view class="search-box">
        <uni-icons type="search" size="16" color="#999"></uni-icons>
        <input 
          class="search-input" 
          placeholder="搜索通知标题或内容"
          v-model="searchKeyword"
          @input="handleSearch"
        />
      </view>
    </view>

    <!-- 通知列表 -->
    <view class="notification-list">
      <view 
        class="notification-item" 
        v-for="item in filteredNotifications" 
        :key="item.id"
        @click="editNotification(item)"
      >
        <view class="item-header">
          <view class="item-title">{{ item.title }}</view>
          <view class="item-status" :class="item.status">
            {{ getStatusText(item.status) }}
          </view>
        </view>
        
        <view class="item-content">{{ item.content }}</view>
        
        <view class="item-meta">
          <view class="meta-info">
            <text class="meta-label">创建时间：</text>
            <text class="meta-value">{{ formatTime(item.createTime) }}</text>
          </view>
          <view class="meta-info" v-if="item.sendTime">
            <text class="meta-label">发送时间：</text>
            <text class="meta-value">{{ formatTime(item.sendTime) }}</text>
          </view>
        </view>
        
        <view class="item-actions">
          <view class="action-btn edit" @click.stop="editNotification(item)">编辑</view>
          <view class="action-btn send" v-if="item.status === 'draft'" @click.stop="sendNotification(item)">发送</view>
          <view class="action-btn delete" @click.stop="deleteNotification(item)">删除</view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredNotifications.length === 0">
        <uni-icons type="notification" size="60" color="#ccc"></uni-icons>
        <text class="empty-text">暂无通知记录</text>
      </view>
    </view>

    <!-- 创建/编辑通知弹窗 -->
    <uni-popup ref="notificationModal" type="bottom">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">{{ isEdit ? '编辑通知' : '创建通知' }}</text>
          <view class="modal-close" @click="closeModal">
            <uni-icons type="close" size="20" color="#999"></uni-icons>
          </view>
        </view>
        
        <view class="modal-body">
          <view class="form-group">
            <text class="form-label">通知标题</text>
            <uni-easyinput
              class="form-input"
              placeholder="请输入通知标题"
              v-model="formData.title"
              maxlength="50"
              :inputBorder="false"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">通知内容</text>
            <uni-easyinput
              type="textarea"
              class="form-textarea"
              placeholder="请输入通知内容"
              v-model="formData.content"
              maxlength="500"
              :inputBorder="false"
            />
          </view>
          
        </view>
        
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closeModal">取消</button>
          <button class="modal-btn draft" @click="saveDraft">保存草稿</button>
          <button class="modal-btn confirm" @click="sendImmediately">立即发送</button>
        </view>
      </view>
    </uni-popup>

    <!-- 确认删除弹窗 -->
    <uni-popup ref="deleteModal" type="dialog">
      <uni-popup-dialog 
        mode="base" 
        title="确认删除" 
        content="确定要删除这条通知吗？删除后无法恢复。"
        @confirm="confirmDelete"
        @close="cancelDelete"
      ></uni-popup-dialog>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import uniEasyinput from '@dcloudio/uni-ui/lib/uni-easyinput/uni-easyinput.vue'
import {
  fetchAdminNotifications,
  createAdminNotification,
  updateAdminNotification,
  deleteAdminNotification,
  sendAdminNotification
} from '../admin_API.js'

// 响应式数据
const activeTab = ref('all')
const searchKeyword = ref('')
const isEdit = ref(false)
const currentEditId = ref(null)
const deleteTargetId = ref(null)

// 表单数据
const formData = reactive({
  title: '',
  content: ''
})


// 通知列表数据
const notifications = ref([])

// 引用
const notificationModal = ref()
const deleteModal = ref()



// 计算属性
const filteredNotifications = computed(() => {
  let result = notifications.value
  
  // 按状态筛选
  if (activeTab.value !== 'all') {
    result = result.filter(item => item.status === activeTab.value)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item => 
      item.title.toLowerCase().includes(keyword) || 
      item.content.toLowerCase().includes(keyword)
    )
  }
  
  return result.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
})

// 方法
const goBack = () => {
  uni.navigateBack()
}

const switchTab = (tab) => {
  activeTab.value = tab
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
}

const showCreateModal = () => {
  isEdit.value = false
  resetFormData()
  notificationModal.value.open()
}

const editNotification = (item) => {
  isEdit.value = true
  currentEditId.value = item.id
  
  // 填充表单数据
  formData.title = item.title
  formData.content = item.content
  notificationModal.value.open()
}

const closeModal = () => {
  notificationModal.value.close()
  resetFormData()
}

const resetFormData = () => {
  formData.title = ''
  formData.content = ''
}

const validateForm = () => {
  if (!formData.title.trim()) {
    uni.showToast({ title: '请输入通知标题', icon: 'none' })
    return false
  }
  if (!formData.content.trim()) {
    uni.showToast({ title: '请输入通知内容', icon: 'none' })
    return false
  }
  return true
}

const saveDraft = async () => {
  if (!validateForm()) return
  try {
    uni.showLoading({ title: '保存中...' })
    const dto = { title: formData.title, content: formData.content, recipientType: 'all' }
    let res
    if (isEdit.value) {
      res = await updateAdminNotification(currentEditId.value, dto)
    } else {
      res = await createAdminNotification(dto)
    }
    if (!res || res.code !== 200) throw new Error(res?.msg || '保存失败')
    uni.showToast({ title: '草稿已保存', icon: 'success' })
    closeModal()
    loadNotifications()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const sendImmediately = async () => {
  if (!validateForm()) return
  try {
    uni.showLoading({ title: '发送中...' })
    const dto = { title: formData.title, content: formData.content, recipientType: 'all' }
    let id = currentEditId.value
    if (isEdit.value) {
      const res = await updateAdminNotification(id, dto)
      if (!res || res.code !== 200) throw new Error(res?.msg || '更新失败')
    } else {
      const res = await createAdminNotification(dto)
      if (!res || res.code !== 200) throw new Error(res?.msg || '创建失败')
      id = res.data?.id
    }
    if (id) {
      const sendRes = await sendAdminNotification(id)
      if (!sendRes || sendRes.code !== 200) throw new Error(sendRes?.msg || '发送失败')
    }
    uni.showToast({ title: '发送成功', icon: 'success' })
    closeModal()
    loadNotifications()
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const sendNotification = async (item) => {
  try {
    uni.showLoading({ title: '发送中...' })
    const res = await sendAdminNotification(item.id)
    if (!res || res.code !== 200) throw new Error(res?.msg || '发送失败')
    uni.showToast({ title: '发送成功', icon: 'success' })
    loadNotifications()
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const deleteNotification = (item) => {
  deleteTargetId.value = item.id
  deleteModal.value.open()
}

const confirmDelete = async () => {
  try {
    uni.showLoading({ title: '删除中...' })
    const res = await deleteAdminNotification(deleteTargetId.value)
    if (!res || res.code !== 200) throw new Error(res?.msg || '删除失败')
    uni.showToast({ title: '删除成功', icon: 'success' })
    loadNotifications()
  } catch (e) {
    uni.showToast({ title: e.message || '删除失败', icon: 'none' })
  } finally {
    uni.hideLoading()
    deleteModal.value.close()
  }
}

const cancelDelete = () => {
  deleteModal.value.close()
  deleteTargetId.value = null
}


// 工具方法
const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'sent': '已发送'
  }
  return statusMap[status] || status
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// API 调用方法
const loadNotifications = async () => {
  try {
    const statusFilter = activeTab.value === 'all' ? '' : activeTab.value
    const res = await fetchAdminNotifications(statusFilter, searchKeyword.value, 1, 50)
    if (res && res.code === 200 && res.data) {
      notifications.value = res.data.list || []
    }
  } catch (e) {
    console.error('加载通知失败', e)
  }
}



// 生命周期
onMounted(() => {
  loadNotifications()
})
</script>

<style lang="scss" scoped>
.notification-management {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  
  .nav-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .nav-back, .nav-action {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.filter-section {
  background-color: #fff;
  padding: 16px;
  border-bottom: 1px solid #eee;
  
  .filter-tabs {
    display: flex;
    margin-bottom: 16px;
    
    .filter-tab {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      
      &.active {
        color: #007aff;
        border-bottom-color: #007aff;
      }
    }
  }
  
  .search-box {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-radius: 20px;
    
    .search-input {
      flex: 1;
      margin-left: 8px;
      font-size: 14px;
      border: none;
      background: transparent;
    }
  }
}

.notification-list {
  padding: 16px;
  
  .notification-item {
    background-color: #fff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    .item-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .item-title {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
      }
      
      .item-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        margin-left: 12px;
        
        &.draft {
          background-color: #fff3cd;
          color: #856404;
        }
        
        &.sent {
          background-color: #d1ecf1;
          color: #0c5460;
        }
      }
    }
    
    .item-content {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
      margin-bottom: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .item-meta {
      margin-bottom: 12px;
      
      .meta-info {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        
        .meta-label {
          font-size: 12px;
          color: #999;
          min-width: 60px;
        }
        
        .meta-value {
          font-size: 12px;
          color: #666;
        }
      }
    }
    
    .item-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      
      .action-btn {
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
        
        &.edit {
          background-color: #007aff;
          color: #fff;
        }
        
        &.send {
          background-color: #28a745;
          color: #fff;
        }
        
        &.delete {
          background-color: #dc3545;
          color: #fff;
        }
      }
    }
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    
    .empty-text {
      margin-top: 16px;
      font-size: 14px;
      color: #999;
    }
  }
}

.modal-content {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  padding: 0;
  max-height: 80vh;
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    
    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    
    .modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .modal-body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
    
    .form-group {
      margin-bottom: 20px;
      
      .form-label {
        display: block;
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
      }
      
      .form-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .form-textarea {
        width: 100%;
        min-height: 80px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      }
      
      .recipient-options, .send-options {
        display: flex;
        gap: 12px;
        
        .recipient-option, .send-option {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          
          &.active {
            background-color: #007aff;
            border-color: #007aff;
            color: #fff;
          }
        }
      }
      
      .specific-recipients {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        
        .recipients-hint {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }
  
  .modal-footer {
    display: flex;
    padding: 16px 20px;
    border-top: 1px solid #eee;
    gap: 12px;
    
    .modal-btn {
      flex: 1;
      padding: 12px 0;
      border-radius: 8px;
      font-size: 16px;
      text-align: center;
      
      &.cancel {
        background-color: #f5f5f5;
        color: #666;
        border: none;
      }
      
      &.confirm {
        background-color: #007aff;
        color: #fff;
        border: none;
      }
    }
  }
}

.back-arrow {
  color: #007aff;
  font-size: 28px;
  font-weight: bold;
  margin-right: 8rpx;
  vertical-align: middle;
}

</style>