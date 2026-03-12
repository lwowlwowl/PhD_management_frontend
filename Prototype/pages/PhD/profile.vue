<template>
	<view class="container">
		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<text class="nav-title">我的</text>
		</view>

		<!-- 主要内容 -->
		<view class="content">
			<!-- 个人信息概览 -->
			<view class="profile-summary">
				<view class="avatar-container">
					<image class="avatar" :src="userInfo.avatar" mode="aspectFill"></image>
				</view>
				<view class="user-info">
					<text class="user-name">{{ userInfo.name }}</text>
					<text class="user-id">学号：{{ userInfo.studentId }}</text>
					<text class="user-research-areas">{{ formatResearchAreas(userInfo.researchAreas) }}</text>
				</view>
			</view>

			<!-- 功能列表 -->
			<view class="function-groups">
				<!-- 第一组 -->
				<view class="group-header">
					<text class="group-title">核心管理</text>
				</view>
				<view class="function-group">
					<view class="function-item" @click="navigateToResearchAreas">
						<view class="function-left">
							<view class="function-icon">
								<image class="icon-image" src="/static/change.png"></image>
							</view>
							<text class="function-title">修改研究方向</text>
						</view>
						<text class="arrow">></text>
					</view>
				</view>

				<!-- 第二组 -->
				<view class="group-header">
					<text class="group-title">账户设置</text>
				</view>
				<view class="function-group">
					<view class="function-item" @click="navigateToChangePassword">
						<view class="function-left">
							<view class="function-icon">
								<image class="icon-image" src="/static/lock.png"></image>
							</view>
							<text class="function-title">修改密码</text>
						</view>
						<text class="arrow">></text>
					</view>
				</view>

				<!-- 第三组 -->
				<view class="group-header">
					<text class="group-title">应用操作</text>
				</view>
				<view class="function-group">
					<view class="logout-item" @click="showLogoutConfirm">
						<text class="logout-text">退出登录</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 退出登录确认弹窗 -->
		<view class="modal-overlay" v-if="showLogoutModal" @click="hideLogoutConfirm">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">确认退出</text>
				</view>
				<view class="modal-body">
					<text class="modal-message">确定要退出登录吗？</text>
				</view>
				<view class="modal-actions">
					<view class="modal-button cancel-button" @click="hideLogoutConfirm">
						<text class="button-text">取消</text>
					</view>
					<view class="modal-button confirm-button" @click="confirmLogout">
						<text class="button-text">退出</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部导航栏 -->
		<view class="bottom-nav">
		  <view class="nav-item" @click="switchTab('PhD')">
		    <text class="nav-icon">🏠</text>
		    <text class="nav-label">首页</text>
		  </view>
		  <view class="nav-item" @click="switchTab('history')">
		    <text class="nav-icon">📋</text>
		    <text class="nav-label">历史</text>
		  </view>
		  <view class="nav-item active">
		    <text class="nav-icon">👤</text>
		    <text class="nav-label">我的</text>
		  </view>
		</view>
	</view>
</template>



<script setup>
import { ref, reactive, onMounted, onUnmounted, } from 'vue'
import { onShow } from '@dcloudio/uni-app';
import { fetchStudentInfo, logoutUser } from './PhD_API.js'

const currentTab = ref('profile')
const showLogoutModal = ref(false)

const userInfo = reactive({
	name: '',
	studentId: '',
	researchAreas: [],
	avatar: ''
})

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
  console.log('Token存在，开始加载用户信息');
  return true;
}

// 格式化研究方向显示
const formatResearchAreas = (areas) => {
	console.log('格式化研究方向数据:', areas);
	
	if (!areas) {
		return '未设置研究方向'
	}
	
	// 如果是字符串，直接返回
	if (typeof areas === 'string') {
		return areas;
	}
	
	// 如果是数组
	if (Array.isArray(areas)) {
		if (areas.length === 0) {
			return '未设置研究方向'
		}
		// 处理数组中的每个元素
		return areas.map(area => {
			if (typeof area === 'string') {
				return area;
			} else if (area && area.name) {
				return area.name;
			} else {
				return '未知方向';
			}
		}).join('、')
	}
	
	// 如果是对象
	if (typeof areas === 'object' && areas.name) {
		return areas.name;
	}
	
	return '未设置研究方向'
}

// 加载用户信息
const loadUserInfo = async () => {
	console.log('开始加载用户信息...');
	
	// 检查登录状态
	if (!checkLoginStatus()) {
		return;
	}
	
	try {
		const response = await fetchStudentInfo();
		const data = handleApiResponse(response, '用户信息');
		
		console.log('用户信息API成功，解析后的data:', data);
		
		if (data) {
			// 处理研究方向数据
			let researchAreaData = null;
			if (data.researchAreaName) {
				researchAreaData = data.researchAreaName;
			} else if (data.researchArea) {
				researchAreaData = data.researchArea;
			} else if (data.researchAreas) {
				researchAreaData = data.researchAreas;
			}
			
			userInfo.name = data.name || '未知用户';
			userInfo.studentId = data.studentId || '未知';
			userInfo.researchAreas = researchAreaData;
			userInfo.avatar = '/static/images/default-avatar.png'; // 用户不能自己上传头像
			
			console.log('更新后的userInfo:', {
				name: userInfo.name,
				studentId: userInfo.studentId,
				researchAreas: userInfo.researchAreas,
				avatar: userInfo.avatar
			});
		} else {
			console.log('用户信息为空，可能用户未绑定PhD信息');
			uni.showToast({ title: '未找到用户信息', icon: 'none' });
		}
		
	} catch (error) {
		console.error('加载用户信息失败:', error);
		uni.showToast({ 
			title: `获取用户信息失败: ${error.message}`, 
			icon: 'none',
			duration: 3000
		});
	}
}

onShow(() => {
	console.log('Profile页面挂载完毕');
	loadUserInfo()
})

const navigateToResearchAreas = () => {
	uni.navigateTo({
		url: '/pages/PhD/research-areas'
	})
}

const navigateToChangePassword = () => {
	uni.navigateTo({
		url: '/pages/common/change-password'
	})
}

const showLogoutConfirm = () => {
	showLogoutModal.value = true
}

const hideLogoutConfirm = () => {
	showLogoutModal.value = false
}

const confirmLogout = async () => {
	console.log('开始执行退出登录...');
	
	// 执行退出登录API
	try {
		await logoutUser()
		console.log('后端退出登录API调用成功');
	} catch (e) {
		console.log('后端退出登录API调用失败，但继续执行本地清理:', e);
	}
	
	uni.showToast({
		title: '退出成功',
		icon: 'success'
	})
	
	// 清除本地token
	uni.removeStorageSync('token')
	console.log('本地token已清除');
	
	// 跳转到登录页
	setTimeout(() => {
		uni.reLaunch({
			url: '/pages/login/login'
		})
	}, 1500);
	
	showLogoutModal.value = false
}

const switchTab = (tab) => {
	currentTab.value = tab
	switch(tab) {
		case 'PhD':
			uni.reLaunch({ url: '/pages/PhD/PhD' })
			break
		case 'history':
			uni.reLaunch({ url: '/pages/PhD/history' })
			break
		case 'profile':
			break
	}
}
</script>



<style scoped>
.container {
	min-height: 100vh;
	background: #f2f2f7;
	display: flex;
	flex-direction: column;
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


/* 个人信息概览 */
.profile-summary {
	background: #ffffff;
	padding: 40rpx 32rpx;
	display: flex;
	align-items: center;
	border-bottom: 1rpx solid rgba(60, 60, 67, 0.1);
}

.avatar-container {
	margin-right: 24rpx;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background: #e5e5ea;
}

.user-info {
	flex: 1;
}

.user-name {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: #000000;
	margin-bottom: 8rpx;
}

.user-id {
	display: block;
	font-size: 28rpx;
	color: #8e8e93;
	margin-bottom: 4rpx;
}

.user-research-areas {
	display: block;
	font-size: 26rpx;
	color: #007aff;
	font-weight: 500;
	line-height: 1.3;
}

/* 功能列表 */
.function-groups {
	padding: 32rpx 0;
}

.function-group {
	background: #ffffff;
	margin: 0 32rpx 32rpx 32rpx;
	border-radius: 16rpx;
	overflow: hidden;
}

.function-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid rgba(60, 60, 67, 0.1);
	transition: background-color 0.2s ease;
}

.function-item:last-child {
	border-bottom: none;
}

.function-item:active {
	background-color: rgba(60, 60, 67, 0.05);
}

.function-left {
	display: flex;
	align-items: center;
}

.function-icon {
	width: 56rpx;
	height: 56rpx;
	border-radius: 12rpx;
	background: rgba(0, 122, 255, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.icon-text {
	font-size: 32rpx;
}

.icon-image {
	width: 32rpx;
	height: 32rpx;
}

.function-title {
	font-size: 32rpx;
	color: #000000;
	font-weight: 400;
}

.arrow {
	font-size: 32rpx;
	color: #c7c7cc;
	font-weight: 300;
}

/* 退出登录 */
.logout-item {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 28rpx 32rpx;
	transition: background-color 0.2s ease;
}

.logout-item:active {
	background-color: rgba(255, 59, 48, 0.05);
}

.logout-text {
	font-size: 32rpx;
	color: #ff3b30;
	font-weight: 400;
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

/* 功能组标题 */
.group-header {
	padding: 0 48rpx 16rpx 48rpx;
	margin-top: 24rpx;
	position: relative;
}

.group-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #8e8e93;
	letter-spacing: 1rpx;
	text-transform: uppercase;
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