<template>
  <view class="container">
	<!-- 顶部导航栏 -->
	<view class="nav-bar">
	  	<text class="nav-title">我的年度评审</text>
	</view>
	  
    <!-- 页面头部信息 -->
    <view class="page-header">
      <view class="header-top">
        <text class="page-title">PhD</text>
        <view class="user-info">
          <text class="welcome-text">欢迎，{{ studentInfo.name }}</text>
          <text class="student-id">{{ studentInfo.studentId }}</text>
        </view>
      </view>
      <view class="header-stats">
        <view class="stat-item">
          <text class="stat-number">{{ studentInfo.totalReviews }}</text>
          <text class="stat-label">历次评审</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-number">{{ studentInfo.currentYear }}</text>
          <text class="stat-label">在读年限</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-number">{{ studentInfo.researchArea }}</text>
          <text class="stat-label">研究方向</text>
        </view>
      </view>
    </view>

    <!-- 当前年审状态卡片 -->
    <view class="status-card">
      <view class="status-header">
        <text class="status-title">当前年审状态</text>
        <view class="status-badge" :class="currentReview.status">
          {{ getStatusText(currentReview.status) }}
        </view>
      </view>
      
      <view v-if="currentReview.scheduled" class="review-info">
        <!-- 优化后的日期时间显示 -->
        <view class="datetime-card">
          <view class="datetime-icon">📅</view>
          <view class="datetime-content">
            <text class="datetime-main">{{ currentReview.date }}</text>
            <text class="datetime-main">{{ currentReview.time }}</text>
          </view>
          <view class="countdown-info" v-if="countdownDays >= 0">
            <text class="countdown-number">{{ countdownDays }}</text>
            <text class="countdown-label">天后</text>
          </view>
        </view>
        
        <view class="info-row">
          <view class="info-label-with-icon">
            <text class="info-label">📍 地点</text>
          </view>
          <text class="info-value">{{ currentReview.location }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">👥 评审老师</text>
          <view class="assessors-list">
            <text 
              v-for="(assessor, index) in currentReview.assessors" 
              :key="index"
              class="info-value assessor-item"
            >
              {{ assessor }}
            </text>
          </view>
        </view>
      </view>
      
      <view v-else class="no-schedule">
        <view class="no-schedule-icon">⏳</view>
        <text class="no-schedule-text">暂无安排，请等待通知\n</text>
        <text class="no-schedule-sub">系统将自动为您分配合适的评审时间</text>
      </view>
    </view>

    <!-- 通知公告 -->
    <view class="notice-section">
      <view class="section-title">
        <text class="title-text">📢 通知公告</text>
        <text class="more-text" @click="viewAllNotices">查看全部</text>
    </view>
	  
	  
     <view class="notice-list">
             <view 
               v-for="notice in notices" 
               :key="notice.id" 
               class="notice-item"
               :class="{ 'is-read': notice.read }" 
               @click="handleNoticeClick(notice)"
             >
               <view class="notice-header">
                 <view class="title-wrapper">
                    <view v-if="!notice.read" class="red-dot"></view>
                    <text class="notice-title">{{ notice.title }}</text>
                 </view>
                 <text class="notice-time">{{ notice.time }}</text>
               </view>
               <text class="notice-content">{{ notice.content }}</text>
             </view>
           </view>
     
         </view>

    <!-- 底部导航栏 -->
    <view class="bottom-nav">
      <view class="nav-item active">
        <text class="nav-icon">🏠</text>
        <text class="nav-label">首页</text>
      </view>
      <view class="nav-item" @click="switchTab('history')">
        <text class="nav-icon">📋</text>
        <text class="nav-label">历史</text>
      </view>
      <view class="nav-item" @click="switchTab('profile')">
        <text class="nav-icon">👤</text>
        <text class="nav-label">我的</text>
      </view>
    </view>

    <!-- 全部通知弹窗 -->
    <view v-if="showAllNotices" class="modal-overlay" @click="closeAllNotices">
          <view class="modal-content" @click.stop>
            <view class="modal-header">
              <text class="modal-title">全部通知</text>
              <text class="modal-close" @click="closeAllNotices">✕</text>
            </view>
            
            <scroll-view 
              class="modal-body" 
              scroll-y 
              @scrolltolower="loadMoreNotices"
			  :lower-threshold="5"
            >
              <view 
                v-for="notice in allNotices" 
                :key="notice.id" 
                class="modal-notice-item"
                :class="{ 'is-read': notice.read }"
                @click="handleNoticeClick(notice)"
              >
                <view class="notice-header">
                  <view class="title-wrapper">
                     <view v-if="!notice.read" class="red-dot"></view>
                     <text class="notice-title">{{ notice.title }}</text>
                  </view>
                  <text class="notice-time">{{ notice.time }}</text>
                </view>
                <text class="notice-content">{{ notice.content }}</text>
              </view>
    
              <view class="loading-text">
                {{ isLoading ? '加载中...' : (hasMore ? '上拉加载更多' : '没有更多了') }}
              </view>
            </scroll-view>
          </view>
        </view>
  </view>
</template>



<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app';
import {
  fetchStudentInfo,
  fetchCurrentReview,
  fetchNotices,
  markNoticeAsRead
} from './PhD_API.js'

const currentTab = ref('PhD')
const showAllNotices = ref(false)

// 学生信息
const studentInfo = ref({
  name: '',
  studentId: '',
  totalReviews: 0,
  currentYear: '',
  researchArea: ''
})

const currentReview = ref({
  status: '', // 'scheduled', 'pending', 'completed'
  scheduled: false,
  date: '',
  time: '',
  location: '',
  assessors: []
})

const notices = ref([])
const allNotices = ref([])

// 计算距离评审还有多少天
const countdownDays = computed(() => {
  if (!currentReview.value.scheduled || !currentReview.value.date) return -1
  const today = new Date()
  const dateStr = currentReview.value.date.replace(/年|月/g, '-').replace(/日/g, '')
  const reviewDate = new Date(dateStr)
  const diffTime = reviewDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const getStatusText = (status) => {
  const statusMap = {
    'scheduled': '已安排',
    'pending': '待安排',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '未知'
}

const switchTab = (tab) => {
  currentTab.value = tab
  switch(tab) {
    case 'PhD':
      break
    case 'history':
      uni.reLaunch({ url: '/pages/PhD/history' })
      break
    case 'profile':
      uni.reLaunch({ url: '/pages/PhD/profile' })
      break
  }
}

// 查看全部通知
const viewAllNotices = () => {
  showAllNotices.value = true
}

// 关闭全部通知弹窗
const closeAllNotices = () => {
  showAllNotices.value = false
}

const viewNoticeDetail = (notice) => {
  uni.showModal({
    title: notice.title,
    content: notice.content,
    showCancel: false
  })
}

// 通用的API响应处理函数
// request.js 已返回 res.data（即 {code, data, message}），不再有 statusCode
const handleApiResponse = (response, dataType) => {
  console.log(`${dataType} API原始返回:`, response);
  
  if (!response) {
    throw new Error('API响应为空');
  }
  
  // 检查业务状态码
  if (response.code !== 200) {
    throw new Error(`业务错误: ${response.message || '未知错误'}`);
  }
  
  return response.data;
}

// 初始化数据
const loadStudentInfo = async () => {
  console.log('1. 开始加载学生信息...');
  try {
    const response = await fetchStudentInfo();
    const data = handleApiResponse(response, '学生信息');
    
    console.log('1.2 学生信息API成功，解析后的data:', data);
    
    if (data) {
      // 处理研究方向数据 - 如果是对象则取name属性，否则直接使用
      let researchAreaDisplay = '未设置';
      if (data.researchAreaName) {
        researchAreaDisplay = data.researchAreaName;
      } else if (data.researchArea) {
        if (typeof data.researchArea === 'object' && data.researchArea.name) {
          researchAreaDisplay = data.researchArea.name;
        } else if (typeof data.researchArea === 'string') {
          researchAreaDisplay = data.researchArea;
        }
      }
      
      studentInfo.value = {
        name: data.name || '未知',
        studentId: data.studentId || '未知',
        totalReviews: data.totalReviews || 0, 
        currentYear: data.currentYear || '未知',
        researchArea: researchAreaDisplay
      };
      console.log('1.3 更新后的studentInfo.value:', studentInfo.value);
      console.log('1.4 研究方向原始数据:', data.researchArea);
    } else {
      console.log('1.4 学生信息为空，可能用户未绑定PhD信息');
      uni.showToast({ title: '未找到学生信息', icon: 'none' });
    }
    
  } catch (error) {
    console.error('1.5 加载学生信息失败:', error);
    uni.showToast({ 
      title: `获取学生信息失败: ${error.message}`, 
      icon: 'none',
      duration: 3000
    });
  }
}

const loadCurrentReview = async () => {
  console.log('2. 开始加载当前年审状态...');
  try {
    const response = await fetchCurrentReview();
    const data = handleApiResponse(response, '年审状态');
    console.log('2.2 年审状态API成功，解析后的data:', data);
    
    if (data) {
      // 后端没有 scheduled 字段，用 status === 'scheduled' 推导
      const isScheduled = data.scheduled !== undefined
        ? !!data.scheduled
        : data.status === 'scheduled'

      // 后端用 startTime/endTime ISO 字符串，前端需要分别格式化成日期和时间
      let dateStr = data.date || ''
      let timeStr = data.time || ''
      if (!dateStr && data.startTime) {
        const d = new Date(data.startTime)
        dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
      }
      if (!timeStr && data.startTime) {
        const d = new Date(data.startTime)
        const h = d.getHours().toString().padStart(2, '0')
        const m = d.getMinutes().toString().padStart(2, '0')
        // 如果有 endTime 一并显示时间段
        if (data.endTime) {
          const e = new Date(data.endTime)
          const eh = e.getHours().toString().padStart(2, '0')
          const em = e.getMinutes().toString().padStart(2, '0')
          timeStr = `${h}:${m} - ${eh}:${em}`
        } else {
          timeStr = `${h}:${m}`
        }
      }

      currentReview.value = {
        status: data.status || 'pending',
        scheduled: isScheduled,
        date: dateStr,
        time: timeStr,
        location: data.location || '',
        assessors: data.assessors || []
      };
      console.log('2.3 更新后的currentReview.value:', currentReview.value);
    }
    
  } catch (error) {
    console.error('2.4 加载年审状态失败:', error);
    uni.showToast({ 
      title: `获取年审状态失败: ${error.message}`, 
      icon: 'none',
      duration: 3000
    });
  }
}

// 分页相关变量
const page = ref(1);          // 当前页码
const pageSize = ref(10);     // 每页条数
const hasMore = ref(true);    // 是否还有更多数据
const isLoading = ref(false); // 防止重复请求

// 修改后的 loadNotices 函数
const loadNotices = async (isLoadMore = false) => {
  if (isLoading.value) return;
  isLoading.value = true;
  
  try {
    // 如果是刷新（非追加），重置页码
    if (!isLoadMore) {
      page.value = 1;
      // 注意：这里先不重置 hasMore，等数据回来再判断
    }

    const response = await fetchNotices(page.value, pageSize.value);
    const data = handleApiResponse(response, '通知');
    
    let list = [];
    if (data.list) list = data.list;
    else if (data.records) list = data.records;
    else if (Array.isArray(data)) list = data;
    
    // 补全 read 属性
    list = list.map(item => ({ ...item, read: !!item.read }));

    if (isLoadMore) {
      allNotices.value = [...allNotices.value, ...list];
    } else {
      allNotices.value = list;
      notices.value = list.slice(0, 2);
    }

    // ==================================================
    // ✅ 核心修复：使用 total 字段精准判断
    // ==================================================
    if (data.total !== undefined) {
      // 如果当前手里拿到的所有数据 >= 总数，说明没更多了
      if (allNotices.value.length >= data.total) {
        hasMore.value = false;
      } else {
        hasMore.value = true;
        page.value++; // 只有确认还有数据，才把页码 +1
      }
    } else {
      // 降级策略（万一后端没返回 total）：
      // 如果这一页的数据少于 pageSize (比如只回来9条)，那肯定没了
      // 如果这一页回来 0 条，也肯定没了
      if (list.length < pageSize.value) {
        hasMore.value = false;
      } else {
        hasMore.value = true;
        page.value++;
      }
    }

  } catch (error) {
    console.error('加载通知失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    isLoading.value = false;
  }
}

// 专门给弹窗用的加载更多函数
const loadMoreNotices = () => {
  if (hasMore.value) {
    loadNotices(true); // 传入 true 表示是追加加载
  }
}

// ✅ 修复后的点击处理函数
const handleNoticeClick = async (notice) => {
  // 1. 如果是未读状态，调用API标记已读
  if (!notice.read) {
    try {
      await markNoticeAsRead(notice.id);
      
      // 立即更新本地视图状态
      notice.read = true;
      
      // 同步更新两个列表的数据（如果它们不是同一个引用）
      const mainNotice = notices.value.find(n => n.id === notice.id);
      if(mainNotice) mainNotice.read = true;
      
      const modalNotice = allNotices.value.find(n => n.id === notice.id);
      if(modalNotice) modalNotice.read = true;
      
    } catch (error) {
      console.error('标记已读失败', error);
    }
  }

  // 2. ❌ 不要用 currentNotice.value = notice
  // 3. ✅ 直接用系统弹窗显示详情
  uni.showModal({
    title: notice.title,
    content: notice.content,
    showCancel: false,
    confirmText: "知道了"
  });
}

// 检查登录状态
const checkLoginStatus = () => {
  const token = uni.getStorageSync('token');
  if (!token) {
    console.log('未找到token，跳转到登录页');
    uni.showModal({
      title: '提示',
      content: '请先登录',
      showCancel: false,
      success: () => {
        uni.redirectTo({
          url: '/pages/login/login'
        });
      }
    });
    return false;
  }
  console.log('Token存在:', token.substring(0, 20) + '...');
  return true;
}

const isInitializing = ref(false)

onShow(() => {
  if (isInitializing.value) return  // 防止重复触发
  isInitializing.value = true

  if (!checkLoginStatus()) {
    isInitializing.value = false
    return
  }

  Promise.all([
    loadStudentInfo(),
    loadCurrentReview(),
    loadNotices()
  ]).finally(() => {
    isInitializing.value = false
  })
})
</script>




<style scoped lang="scss">
.container {
  padding: 0;
  padding-bottom: 120rpx;
  background: #f5f7fa;
  min-height: 100vh;
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
  font-size: 33rpx;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.5rpx;
}

.content {
	flex: 1;
	padding-bottom: 132rpx; /* Add padding for tab bar */
}

/* 页面头部样式 - 调整为深色主题 */
.page-header {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  padding: 60rpx 40rpx 40rpx;
  color: white;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.welcome-text {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 8rpx;
  color: white;
}

.student-id {
  font-size: 24rpx;
  opacity: 0.7;
  color: white;
}

.header-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 32rpx;
  backdrop-filter: blur(10rpx);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-number {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
  color: white;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.8;
  color: white;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 20rpx;
}

/* 状态卡片样式 - 增强对比度 */
.status-card {
  background: white;
  border-radius: 24rpx 24rpx 16rpx 16rpx;
  margin: -20rpx 20rpx 32rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15);
  border: 1rpx solid #e8ecf0;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #2c3e50;
}

.status-badge {
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: white;
}

.status-badge.scheduled {
  background: linear-gradient(45deg, #3498db, #2980b9);
}

/* 优化后的日期时间显示 */
.datetime-card {
  display: flex;
  align-items: center;
  background: linear-gradient(45deg, #ecf0f1, #bdc3c7);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid #d5dbdb;
}

.datetime-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.datetime-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.datetime-main {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
}

.countdown-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #e74c3c;
  color: white;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  min-width: 80rpx;
}

.countdown-number {
  font-size: 32rpx;
  font-weight: bold;
  line-height: 1;
}

.countdown-label {
  font-size: 20rpx;
  opacity: 0.9;
}

/* 准备提醒样式 */
.preparation-reminder {
  background: #ecf0f1;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-top: 24rpx;
  border: 1rpx solid #d5dbdb;
}

.reminder-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16rpx;
}

.reminder-items {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.reminder-item {
  font-size: 26rpx;
  color: #5d6d7e;
  line-height: 1.4;
}

.reminder-item.completed {
  color: #27ae60;
  text-decoration: line-through;
  opacity: 0.7;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e8ecf0;
}

.info-label {
  font-size: 28rpx;
  color: #5d6d7e;
  min-width: 160rpx;
}

/* 地点图标样式 */
.info-label-with-icon {
  display: flex;
  align-items: center;
  min-width: 160rpx;
}

.location-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
}

.info-value {
  font-size: 28rpx;
  color: #2c3e50;
  font-weight: 500;
  flex: 1;
  text-align: right;
}

/* 评审老师列表样式 */
.assessors-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 1;
}

.assessor-item {
  margin-bottom: 8rpx;
}

.assessor-item:last-child {
  margin-bottom: 0;
}

/* 无安排状态优化 */
.no-schedule {
  text-align: center;
  padding: 60rpx 0;
}

.no-schedule-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.no-schedule-text {
  color: #5d6d7e;
  font-size: 32rpx;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.no-schedule-sub {
  color: #85929e;
  font-size: 26rpx;
  line-height: 1.4;
}

/* 通知公告样式 - 增强对比度 */
.notice-section {
  background: white;
  border-radius: 16rpx;
  padding: 32rpx;
  margin: 0 20rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
  border: 1rpx solid #e8ecf0;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #2c3e50;
}

.more-text {
  font-size: 24rpx;
  color: #3498db;
}

.notice-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #e8ecf0;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.notice-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c3e50;
}

.notice-time {
  font-size: 24rpx;
  color: #85929e;
}

.notice-content {
  font-size: 26rpx;
  color: #5d6d7e;
  line-height: 1.4;
}

/* 全部通知弹窗样式 - 修复版本 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  background: white;
  border-radius: 24rpx;
  width: 90%;
  max-width: 700rpx;
  height: 70vh; /* 使用vh单位确保不超出屏幕 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出 */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #e8ecf0;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #2c3e50;
}

.modal-close {
  font-size: 32rpx;
  color: #85929e;
  padding: 8rpx;
  cursor: pointer;
}

/* 修改后的 .modal-body */
.modal-body {
  /* 必须指定宽度，防止坍塌 */
  width: 100%;
  
  /* Flex 子元素撑满剩余空间 */
  flex: 1;
  
  /* 关键：必须设置 overflow-y: auto 才能滚动 */
  overflow-y: auto;
  
  /* 关键：给一个极小的高度基准，配合 flex:1 自动撑开 */
  height: 0; 
  
  /* 针对 H5 的优化 */
  -webkit-overflow-scrolling: touch;
}

.modal-notice-item {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #e8ecf0;
}

.modal-notice-item:last-child {
  border-bottom: none;
  padding-bottom: 32rpx;
}

/* 确保通知内容不会超出边框 */
.modal-notice-item .notice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* 改为flex-start以防标题过长 */
  margin-bottom: 12rpx;
  gap: 20rpx; /* 添加间距 */
}

.modal-notice-item .notice-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
  word-wrap: break-word; /* 确保长标题能够换行 */
  line-height: 1.4;
}

.modal-notice-item .notice-time {
  font-size: 24rpx;
  color: #85929e;
  flex-shrink: 0; /* 防止时间被压缩 */
  white-space: nowrap;
}

.modal-notice-item .notice-content {
  font-size: 26rpx;
  color: #5d6d7e;
  line-height: 1.5;
  word-wrap: break-word; /* 确保长内容能够换行 */
  overflow-wrap: break-word;
}

/* 底部导航栏 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #ffffff;
  border-top: 1rpx solid #e0e6ed;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 22rpx;
  color: #666;
}

.nav-item.active .nav-label {
  color: #667eea;
  font-weight: 500;
}

/* 未读的小红点 */
.red-dot {
    width: 16rpx;
    height: 16rpx;
    background-color: #ff4d4f;
    border-radius: 50%;
    margin-right: 12rpx;
}

/* 已读状态：整体变灰，文字变淡 */
.notice-item.is-read .title {
    color: #999; /* 标题变灰 */
}

.notice-item.is-read {
    background-color: #f9f9f9; /* 背景变暗一点点 */
}

.loading-text {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 20rpx 0;
}
</style>