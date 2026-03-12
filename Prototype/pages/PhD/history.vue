<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">年审历史记录</text>
    </view>
    
    <!-- 年审记录列表 -->
    <view class="history-section">
      <text class="section-title"></text>
      
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-icon">📄</text>
        <text class="empty-text">暂无历史记录</text>
      </view>

      <view v-else class="history-list">
        <view 
          v-for="(item, index) in historyList" 
          :key="index" 
          class="history-item" 
        >
          <!-- 时间线标记 -->
          <view class="timeline-mark">
            <view class="timeline-dot" :class="item.status"></view>
            <view v-if="index < historyList.length - 1" class="timeline-line"></view>
          </view>

          <!-- 记录内容 -->
          <view class="record-content">
            <view class="record-header">
              <text class="record-title">{{ item.academicYear }} 年审</text>
              <view class="status-badge" :class="item.status">
                {{ getStatusText(item.status) }}
              </view>
            </view>

            <view class="record-details">
              <view class="detail-row">
                <text class="detail-icon">📅</text>
                <text class="detail-text">{{ item.date }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-icon">⏰</text>
                <text class="detail-text">{{ item.timeSlot }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-icon">🏢</text>
                <text class="detail-text">{{ item.room }}</text>
              </view>
              <view class="detail-row">
                <text class="detail-icon">👥</text>
                <text class="detail-text">{{ item.assessor1 }} · {{ item.assessor2 }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="bottom-nav">
      <view class="nav-item" @click="navigateTo('/pages/PhD/PhD')">
        <text class="nav-icon">🏠</text>
        <text class="nav-label">首页</text>
      </view>
      <view class="nav-item active">
        <text class="nav-icon">📋</text>
        <text class="nav-label">历史</text>
      </view>
      <view class="nav-item" @click="navigateTo('/pages/PhD/profile')">
        <text class="nav-icon">👤</text>
        <text class="nav-label">我的</text>
      </view>
    </view>
  </view>
</template>



<script setup>
import { ref, onMounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { fetchReviewHistory } from './PhD_API.js'

// 响应式数据
const historyList = ref([])
const totalReviews = ref(0)
const completedReviews = ref(0)
const averageScore = ref(0)

// 生命周期
onLoad(() => {
  loadHistoryData()
})

// 下拉刷新
onPullDownRefresh(() => {
  refreshData()
})

// 导航跳转（底部Tab之间用reLaunch清空页面栈，避免堆积）
const navigateTo = (url) => {
  uni.reLaunch({
    url: url
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
  console.log('Token存在，开始加载历史数据');
  return true;
}

// 加载历史数据
const loadHistoryData = async () => {
  console.log('开始加载年审历史数据...');
  
  // 检查登录状态
  if (!checkLoginStatus()) {
    return;
  }
  
  uni.showLoading({
    title: '加载中...'
  })
  
  try {
    await fetchHistoryData()
    calculateStats()
    console.log('历史数据加载完成');
  } catch (error) {
    console.error('加载历史数据失败:', error)
    uni.showToast({
      title: `加载失败: ${error.message}`,
      icon: 'none',
      duration: 3000
    })
  } finally {
    uni.hideLoading()
    uni.stopPullDownRefresh && uni.stopPullDownRefresh()
  }
}

// 获取历史数据
const fetchHistoryData = async () => {
  console.log('调用年审历史API...');
  try {
    // 调用API - 修复数据解析问题
    const response = await fetchReviewHistory();
    const data = handleApiResponse(response, '年审历史');
    
    console.log('年审历史API成功，解析后的data:', data);
    
    // 处理分页数据 - 兼容不同的分页数据结构
    let list = [];
    if (data.list) {
      list = data.list;
    } else if (data.records) {
      list = data.records;
    } else if (Array.isArray(data)) {
      list = data;
    } else {
      console.warn('年审历史数据结构异常:', data);
      list = [];
    }
    
    // 将后端字段映射为模板所需字段
    historyList.value = list.map(item => {
      const start = item.startTime ? new Date(item.startTime) : null
      const end = item.endTime ? new Date(item.endTime) : null
      const pad = n => String(n).padStart(2, '0')
      return {
        ...item,
        academicYear: item.reviewYear || '',
        date: start ? `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}` : '',
        timeSlot: (start && end)
          ? `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`
          : '',
        room: item.location || '',
        assessor1: (item.assessors && item.assessors[0]) || '',
        assessor2: (item.assessors && item.assessors[1]) || ''
      }
    })
    console.log('更新后的historyList:', historyList.value);
    
  } catch (error) {
    console.error('获取年审历史失败:', error);
    historyList.value = [];
    throw error; // 重新抛出错误，让上级处理
  }
}

// 计算统计数据
const calculateStats = () => {
  console.log('开始计算统计数据...');
  
  totalReviews.value = historyList.value.length
  completedReviews.value = historyList.value.filter(item => item.status === 'completed').length
  
  if (completedReviews.value > 0) {
    const totalScore = historyList.value
      .filter(item => item.score && !isNaN(item.score))
      .reduce((sum, item) => sum + Number(item.score), 0)
    averageScore.value = completedReviews.value > 0 ? Math.round(totalScore / completedReviews.value) : 0
  } else {
    averageScore.value = 0
  }
  
  console.log('统计数据:', {
    totalReviews: totalReviews.value,
    completedReviews: completedReviews.value,
    averageScore: averageScore.value
  });
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'completed': '已完成',
    'scheduled': '已安排',
    'pending': '待安排',
    'cancelled': '已取消'
  }
  return statusMap[status] || '未知'
}

// 下拉刷新实际调用
const refreshData = () => {
  console.log('执行下拉刷新...');
  loadHistoryData()
}

// 页面挂载时加载数据
onMounted(() => {
  console.log('History页面挂载完毕');
})
</script>



<style scoped lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 120rpx; /* 为底部导航栏留出空间 */
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

/* 历史记录列表 */
.history-section {
  padding: 0 40rpx 40rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
}

.empty-state {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 80rpx 40rpx;
  text-align: center;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.08);
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #666;
}

.history-list {
  position: relative;
}

.history-item {
  display: flex;
  margin-bottom: 30rpx;
  cursor: pointer;
}

.history-item:last-child {
  margin-bottom: 0;
}

/* 时间线 */
.timeline-mark {
  position: relative;
  margin-right: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  margin-top: 30rpx;
}

.timeline-dot.completed {
  background-color: #4caf50;
}

.timeline-dot.scheduled {
  background-color: #2196f3;
}

.timeline-dot.pending {
  background-color: #ff9800;
}

.timeline-dot.cancelled {
  background-color: #f44336;
}

.timeline-line {
  width: 2rpx;
  height: 100rpx;
  background-color: #e0e6ed;
  margin-top: 10rpx;
}

/* 记录内容 */
.record-content {
  flex: 1;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.history-item:hover .record-content {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.12);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.record-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status-badge.completed {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.status-badge.scheduled {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-badge.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.record-details {
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-icon {
  font-size: 24rpx;
  margin-right: 12rpx;
  width: 32rpx;
}

.detail-text {
  font-size: 26rpx;
  color: #666;
  flex: 1;
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
</style>