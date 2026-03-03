<template>
  <view class="profile-container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">我的</text>
    </view>

    <!-- 个人信息概览 -->
    <view class="profile-header">
      <view class="avatar-section">
        <view class="avatar">
          <text class="avatar-text">{{ getAvatarText(teacherInfo.name) }}</text>
        </view>
      </view>
      <view class="info-section">
        <text class="user-name">{{ teacherInfo.name }}</text>
        <text class="user-research-areas">{{ formatResearchAreas(teacherInfo.researchAreas) }}</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <scroll-view class="function-list" scroll-y="true">
      <!-- 第一组：核心管理 -->
      <view class="function-group">
        <view class="group-header">
          <text class="group-title">核心管理</text>
        </view>
        <view class="function-items">
          <view class="function-item" @click="handleManageResearchAreas">
            <view class="item-left">
              <view class="item-icon research-icon">
                <text class="icon-text">🏷️</text>
              </view>
              <text class="item-title">研究方向管理</text>
            </view>
            <view class="item-right">
              <text class="arrow-icon">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 第二组：账户设置 -->
      <view class="function-group">
        <view class="group-header">
          <text class="group-title">账户设置</text>
        </view>
        <view class="function-items">
          <view class="function-item" @click="handleChangePassword">
            <view class="item-left">
              <view class="item-icon password-icon">
                <text class="icon-text">🔒</text>
              </view>
              <text class="item-title">修改密码</text>
            </view>
            <view class="item-right">
              <text class="arrow-icon">›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 第三组：应用操作 -->
      <view class="function-group">
        <view class="group-header">
          <text class="group-title">应用操作</text>
        </view>
        <view class="function-items">
          <view class="function-item logout-item" @click="handleLogout">
            <view class="item-center">
              <text class="logout-text">退出登录</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-space"></view>
    </scroll-view>
    
    <!-- 底部导航 -->
    <view class="custom-tab-bar">
      <view class="tab-item" @click="navigateTo('schedule')">
        <view class="tab-icon">📅</view>
        <text class="tab-text">评审日程</text>
      </view>
      <view class="tab-item active" @click="navigateTo('profile')">
        <view class="tab-icon">👤</view>
        <text class="tab-text">我的</text>
      </view>
    </view>

    <!-- 退出登录确认弹窗 -->
    <view v-if="showLogoutModal" class="modal-overlay" @click="hideLogoutModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">确认退出</text>
        </view>
        <view class="modal-body">
          <text class="modal-message">确定要退出登录吗？</text>
        </view>
        <view class="modal-actions">
          <view class="modal-button cancel-button" @click="hideLogoutModal">
            <text class="button-text">取消</text>
          </view>
          <view class="modal-button confirm-button" @click="confirmLogout">
            <text class="button-text">退出</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { teacherAPI, researchAPI, authAPI, apiUtils, wsManager } from '@/pages/teacher/teacher_API.js'

// 响应式数据
const teacherInfo = ref({
  name: '王伟',
  researchAreas: []
})

const showLogoutModal = ref(false)

onMounted(async () => {
  // 页面加载时的初始化逻辑
  console.log('老师端我的页面已加载')
  
  // 从本地存储获取教师信息作为初始值
  const storedTeacherInfo = uni.getStorageSync('teacherInfo')
  if (storedTeacherInfo) {
    teacherInfo.value = {
      name: storedTeacherInfo.name || '王伟',
      researchAreas: storedTeacherInfo.researchAreas || []
    }
  }

  // 尝试从API获取最新的教师信息
  try {
    const profileRes = await teacherAPI.getProfile()
    if (profileRes.code === 200) {
      teacherInfo.value = {
        name: profileRes.data.name || '',
        researchAreas: profileRes.data.researchAreas || []
      }
      
      // 更新本地存储
      uni.setStorageSync('teacherInfo', teacherInfo.value)
    }
  } catch (error) {
    console.error('获取教师信息失败:', error)
    // 失败时继续使用本地存储的数据
  }

  // 监听研究方向更新事件
  uni.$on('teacherResearchAreasUpdated', handleResearchAreasUpdate)
})

onUnmounted(() => {
  uni.$off('teacherResearchAreasUpdated', handleResearchAreasUpdate)
})

// 方法定义
const getAvatarText = (name) => {
  return name ? name.charAt(name.length - 1) : 'T'
}

const handleManageResearchAreas = () => {
  console.log('点击研究方向管理')
  // 跳转到研究方向管理页面
  uni.redirectTo({
    url: '/pages/teacher/research-area'
  })
}

const handleChangePassword = () => {
  console.log('点击修改密码')
  // 跳转到修改密码页面（与博士生端复用）
  uni.redirectTo({
    url: '/pages/common/change-password'
  })
}

const handleLogout = () => {
  showLogoutModal.value = true
}

const hideLogoutModal = () => {
  showLogoutModal.value = false
}

const confirmLogout = async () => {
  console.log('确认退出登录')
  
  try {
    // 调用登出API
    await authAPI.logout()
  } catch (error) {
    // 即使登出API失败，也继续清除本地数据
    console.warn('登出API调用失败，但继续清除本地数据:', error)
  }
  
  // 断开 WebSocket 连接
  wsManager.disconnect()
  
  // 清除登录状态
  uni.removeStorageSync('teacherInfo')
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
  uni.removeStorageSync('userRole')
  
  // 跳转到登录页面
  uni.reLaunch({
    url: '/pages/login/login'
  })
  
  hideLogoutModal()
}

// 自定义底部导航方法
const navigateTo = (page) => {
  if (page === 'profile') {
    // 已经在当前页，不需要跳转
    return
  } else if (page === 'schedule') {
    uni.reLaunch({
      url: '/pages/teacher/schedule'
    })
  }
}

const formatResearchAreas = (areas) => {
  if (!areas || areas.length === 0) {
    return '未设置研究方向'
  }
  
  // 过滤出已通过审核的研究方向
  const approvedAreas = areas.filter(area => area.status === 'approved' || !area.status)
  
  if (approvedAreas.length === 0) {
    // 检查是否有待审核的研究方向
    const pendingAreas = areas.filter(area => area.status === 'pending')
    if (pendingAreas.length > 0) {
      return `${pendingAreas.length}个待审核`
    }
    return '暂无通过的研究方向'
  }
  
  return approvedAreas.map(area => area.name).join('、')
}

const handleResearchAreasUpdate = (newAreas) => {
  teacherInfo.value.researchAreas = newAreas
  const storedTeacherInfo = uni.getStorageSync('teacherInfo') || {}
  storedTeacherInfo.researchAreas = newAreas
  uni.setStorageSync('teacherInfo', storedTeacherInfo)
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  /* 修改背景为灰色渐变，匹配图片样式 */
  background: linear-gradient(180deg, #f2f2f7 0%, #f2f2f7 100%);
  /* 修改整体容器的padding，确保内容不会紧贴边框 */
  padding: 0 24rpx;
  box-sizing: border-box;
  padding-bottom: 120rpx; /* 为底部导航预留空间 */
}

/* 顶部导航栏 */
.nav-bar {
  height: 88rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  /* 调整导航栏的margin，避免紧贴 */
  margin: 0 -24rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.5rpx;
}

/* 个人信息概览 */
.profile-header {
  background: #ffffff;
  /* 调整margin，不再额外设置左右margin */
  margin: 24rpx 0;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
  border: 1rpx solid rgba(0, 0, 0, 0.05);
}

.avatar-section {
  margin-right: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: linear-gradient(135deg, #007AFF, #5856D6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 122, 255, 0.3);
}

.avatar-text {
  font-size: 48rpx;
  color: white;
  font-weight: 600;
}

.info-section {
  flex: 1;
}

.user-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #1d1d1f;
  display: block;
  margin-bottom: 8rpx;
}

.user-research-areas {
  font-size: 24rpx;
  color: #8E8E93;
  font-weight: 400;
  display: block;
}

/* 功能列表 */
.function-list {
  flex: 1;
  padding: 0;
}

.function-group {
  margin-bottom: 32rpx;
}

.group-header {
  padding: 0 12rpx 16rpx 12rpx;
  margin-top: 24rpx;
  position: relative;
}

.group-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #8E8E93;
  text-transform: uppercase;
  letter-spacing: 1rpx;
  position: relative;
  display: inline-block;
}

.group-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -6rpx;
  width: 40rpx;
  height: 4rpx;
  background: #007aff;
  border-radius: 2rpx;
}

.function-items {
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(0, 0, 0, 0.05);
}

.function-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease;
}

.function-item:last-child {
  border-bottom: none;
}

.function-item:active {
  background-color: rgba(0, 0, 0, 0.03);
}

.item-left {
  display: flex;
  align-items: center;
}

.item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.research-icon {
  background: linear-gradient(135deg, #FF9500, #FF6B35);
}

.password-icon {
  background: linear-gradient(135deg, #8E8E93, #636366);
}

.icon-text {
  font-size: 28rpx;
}

.item-title {
  font-size: 30rpx;
  color: #1d1d1f;
  font-weight: 500;
}

.item-right {
  display: flex;
  align-items: center;
}

.arrow-icon {
  font-size: 36rpx;
  color: #C7C7CC;
  font-weight: 300;
}

/* 退出登录特殊样式 */
.logout-item {
  justify-content: center;
  padding: 28rpx 32rpx;
}

.item-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-text {
  font-size: 30rpx;
  color: #FF3B30;
  font-weight: 500;
}

.logout-item:active {
  background-color: rgba(255, 59, 48, 0.05);
}

/* 底部间距 */
.bottom-space {
  height: 40rpx;
}

/* 退出登录确认弹窗 */
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
  z-index: 1000;
  backdrop-filter: blur(10rpx);
}

.modal-content {
  background: white;
  border-radius: 28rpx;
  width: 540rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 40rpx 32rpx 24rpx 32rpx;
  text-align: center;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.modal-body {
  padding: 0 32rpx 40rpx 32rpx;
  text-align: center;
}

.modal-message {
  font-size: 28rpx;
  color: #8E8E93;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  border-top: 1rpx solid rgba(0, 0, 0, 0.1);
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

.cancel-button {
  border-right: 1rpx solid rgba(0, 0, 0, 0.1);
}

.cancel-button .button-text {
  color: #007AFF;
  font-size: 30rpx;
  font-weight: 500;
}

.confirm-button .button-text {
  color: #FF3B30;
  font-size: 30rpx;
  font-weight: 600;
}

/* 自定义底部导航 */
.custom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #ffffff;
  display: flex;
  box-shadow: 0 -1rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0;
}

.tab-icon {
  font-size: 36rpx;
  margin-bottom: 4rpx;
}

.tab-text {
  font-size: 24rpx;
  color: #8e8e93;
}

.tab-item.active .tab-text {
  color: #007AFF;
  font-weight: 500;
}

.my-research-area {
  min-height: 120rpx; /* 根據實際情況調整 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24rpx 0;
}

.empty-tip {
  color: #8e8e93;
  font-size: 28rpx;
  margin-top: 24rpx; /* 增加與標題的距離 */
  text-align: center;
}
</style>