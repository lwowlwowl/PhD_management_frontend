<template>
	<view class="container">
		<view class="login-wrapper">
			<!-- 头部区域 -->
			<view class="header">
				<view class="logo-section">
					<view class="logo">🎓</view>
					<text class="app-title">PhD年审系统</text>
				</view>
				<text class="welcome-text">{{ greeting }}，欢迎使用博士生评审系统</text>
			</view>
			
<!-- 			角色选择卡片
			<view class="role-selector">
				<view class="segmented-control">
					<view 
						class="segment" 
						:class="{ active: selectedRole === 'phd' }"
						@click="selectRole('phd')"
					>
						<text class="segment-text">学生</text>
					</view>
					<view 
						class="segment" 
						:class="{ active: selectedRole === 'teacher' }"
						@click="selectRole('teacher')"
					>
						<text class="segment-text">导师</text>
					</view>
					<view 
						class="segment" 
						:class="{ active: selectedRole === 'admin' }"
						@click="selectRole('admin')"
					>
						<text class="segment-text">管理员</text>
					</view>
				</view>
			</view> -->
			
			<!-- 登录表单 -->
			<view class="form-container">
				<view class="input-container">
					<view class="input-wrapper" :class="{ focused: usernameFocused, filled: loginForm.username }">
						<text class="input-label">用户名</text>
						<input 
							class="input-field" 
							type="text" 
							v-model="loginForm.username"
							@focus="usernameFocused = true"
							@blur="usernameFocused = false"
							maxlength="20"
						/>
					</view>
				</view>
				
				<view class="input-container">
					<view class="input-wrapper" :class="{ focused: passwordFocused, filled: loginForm.password }">
						<text class="input-label">密码</text>
					<input 
						class="input-field"
						:class="{ masked: !passwordVisible }"
						type="text"
						v-model="loginForm.password"
						@focus="passwordFocused = true"
						@blur="passwordFocused = false"
						maxlength="20"
					/>
						<view class="password-toggle" @click="togglePasswordVisibility">
							<image 
								class="password-icon" 
								:src="passwordVisible ? '/static/password/view.png' : '/static/password/hide.png'"
								mode="aspectFit"
							/>
						</view>
					</view>
				</view>
				
				<view class="form-footer">
					<text class="forgot-link" @click="forgotPassword">忘记密码？</text>
				</view>
			</view>
			
			<!-- 登录按钮 -->
			<view class="action-section">
				<button 
					class="primary-button" 
					:class="{ disabled: !canLogin }"
					@click="handleLogin"
					:disabled="!canLogin"
				>
					<text class="button-text">登录</text>
				</button>
			</view>
		</view>
		
		<!-- 底部信息 -->
		<view class="footer">
			<text class="footer-text">版本 2.0.0</text>
		</view>
	</view>
</template>



<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginApi } from './loginAPI.js'
import { wsManager } from '@/pages/teacher/teacher_API.js'

// 响应式数据
const greeting = ref('')
//const selectedRole = ref('phd') // 默认选择学生角色
const usernameFocused = ref(false)
const passwordFocused = ref(false)
const passwordVisible = ref(false) // 新增：密码可见性状态

function getGreeting() {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const beijingTime = new Date(utc + 8 * 3600000)
  const hour = beijingTime.getHours()
  if (hour >= 6 && hour < 11) {
    return '早上好'
  } else if (hour >= 11 && hour < 13) {
    return '中午好'
  } else if (hour >= 13 && hour < 18) {
    return '下午好'
  } else {
    return '晚上好'
  }
}

const loginForm = reactive({
	username: '',
	password: ''
})

// 计算属性
const canLogin = computed(() => {
	return loginForm.username.trim() && 
		   loginForm.password.trim()
})

// // 方法
// const selectRole = (role) => {
// 	selectedRole.value = role
// 	// 添加轻微的触觉反馈
// 	uni.vibrateShort()
// }

// 切换密码可见性
const togglePasswordVisibility = () => {
	passwordVisible.value = !passwordVisible.value
	uni.vibrateShort() // 触觉反馈
}

// 统一存储用户信息
function saveUserInfo({ token, role, username, userId, teacherId, phdId, name }) {
  if (token) uni.setStorageSync('token', token);
  if (role) uni.setStorageSync('userRole', role);
  if (username) uni.setStorageSync('username', username);
  if (userId !== undefined) uni.setStorageSync('userId', userId);
  if (teacherId !== undefined) uni.setStorageSync('teacherId', teacherId);
  if (phdId !== undefined) uni.setStorageSync('phdId', phdId);
  if (name) uni.setStorageSync('name', name);
}

// 统一错误提示
function showErrorToast(message) {
  uni.showToast({
    title: message || '操作失败',
    icon: 'none',
    duration: 2000
  });
}

const handleLogin = () => {
	if (!canLogin.value) return;

	uni.vibrateShort();
	uni.showLoading({
		title: '正在登录...',
		mask: true
	});

	// 直接调用，不用 setTimeout
	performLogin();
};

const performLogin = () => {
  const loginData = {
    //role: selectedRole.value,
    username: loginForm.username,
    password: loginForm.password
  };

  loginApi(loginData)
    // resolve(res) 的体现
    .then(res => {
	  uni.hideLoading();
      if (res && res.code === 200) {
        // 登錄成功
        uni.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });
        // 保存用戶信息
        const loginData = res.data;
        saveUserInfo({
          token: loginData.token,
          role: loginData.role,
          username: loginForm.username,
          userId: loginData.userId,
          teacherId: loginData.teacherId,
          phdId: loginData.phdId,
          name: loginData.name
        });
        // teacher 角色：登录成功后立即建立 WebSocket 长连接
        if (loginData.role === 'teacher') {
          wsManager.connect(loginData.token)
        }
        setTimeout(() => {
          navigateByRole(loginData.role);
        }, 1500);
      } else {
        showErrorToast(res && res.msg ? res.msg : '登录失败');
      }
    })

	// reject(err) 的体现
    .catch(err => {
      uni.hideLoading();
      // 检查err对象以提供更具体的错误信息
      if (err.statusCode === 404) {
        showErrorToast('服务器连接失败 (404)');
      } else if (err.errMsg && err.errMsg.includes('timeout')) {
        showErrorToast('网络连接超时，请稍后重试');
      } else {
        showErrorToast('网络错误，请检查您的网络连接');
      }
    });
};

const navigateByRole = (serverRole) => {
	const rolePages = {
		'phd': '/pages/PhD/preparation',
		'teacher': '/pages/teacher/preparation/preparation', 
		'admin': '/pages/admin/dashboard/dashboard'
	}
	
	const targetPage = rolePages[serverRole]
	    
	    if (targetPage) {
	        uni.reLaunch({
	            url: targetPage,
	            fail: (err) => console.error('跳转失败', err)
	        })
	    } else {
	        showErrorToast('未知用户角色，无法跳转');
	    }
}

const forgotPassword = () => {
	uni.showActionSheet({
		itemList: ['通过邮箱重置', '联系管理员'],
		success: (res) => {
			if (res.tapIndex === 0) {
				resetPasswordByEmail()
			} else if (res.tapIndex === 1) {
				contactAdmin()
			}
		}
	})
}

const resetPasswordByEmail = () => {
	uni.showModal({
		title: '重置密码',
		content: '重置链接将发送到您的注册邮箱',
		confirmText: '发送',
		cancelText: '取消',
		success: (res) => {
			if (res.confirm) {
				uni.showToast({
					title: '重置邮件已发送',
					icon: 'success'
				})
			}
		}
	})
}

const contactAdmin = () => {
	uni.showModal({
		title: '联系管理员',
		content: '请联系系统管理员：\nadmin@university.edu',
		showCancel: false,
		confirmText: '好的'
	})
}

onLoad(() => {
  greeting.value = getGreeting()
})
</script>



<style scoped lang="scss">
/* 全局容器 - 修改为完全居中 */
.container {
	min-height: 100vh;
	background: linear-gradient(180deg, #f7f7f7 0%, #ffffff 100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center; /* 新增：垂直居中 */
	padding: 44rpx 32rpx; /* 减少上下内边距 */
}

/* 主要登录包装器 */
.login-wrapper {
	width: 100%;
	max-width: 640rpx;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 48rpx 32rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	border: 1rpx solid rgba(0, 0, 0, 0.04);
}

/* 头部区域 */
.header {
	text-align: center;
	margin-bottom: 48rpx;
}

.logo-section {
	margin-bottom: 16rpx;
}

.logo {
	font-size: 64rpx;
	margin-bottom: 16rpx;
}

.app-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: #1d1d1f;
	letter-spacing: -0.5rpx;
}

.welcome-text {
	font-size: 28rpx;
	color: #86868b;
	font-weight: 400;
}

/* 分段控制器 (苹果风格) */
.role-selector {
	margin-bottom: 48rpx;
}

.segmented-control {
	display: flex;
	background: #f2f2f7;
	border-radius: 12rpx;
	padding: 4rpx;
	position: relative;
}

.segment {
	flex: 1;
	padding: 16rpx 0;
	text-align: center;
	border-radius: 8rpx;
	transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	position: relative;
	z-index: 1;
}

.segment.active {
	background: #ffffff;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.12);
}

.segment-text {
	font-size: 28rpx;
	font-weight: 500;
	color: #1d1d1f;
	transition: color 0.25s ease;
}

.segment:not(.active) .segment-text {
	color: #86868b;
}

/* 表单容器 */
.form-container {
	margin-bottom: 48rpx;
}

.input-container {
	margin-bottom: 24rpx;
}

.input-wrapper {
	position: relative;
	background: #f2f2f7;
	border-radius: 12rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.input-wrapper.focused {
	background: #ffffff;
	border-color: #007aff;
	box-shadow: 0 0 0 6rpx rgba(0, 122, 255, 0.1);
}

.input-wrapper.filled:not(.focused) {
	background: #ffffff;
	border-color: #d1d1d6;
}

/* 优化标签位置和大小 */
.input-label {
	position: absolute;
	left: 20rpx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 32rpx;
	color: #86868b;
	transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	pointer-events: none;
	z-index: 1;
	line-height: 1;
}

.input-wrapper.focused .input-label,
.input-wrapper.filled .input-label {
	top: 16rpx; /* 减少距离顶部的距离 */
	font-size: 22rpx; /* 进一步减小字体 */
	color: #86868b;
	transform: translateY(0);
}

.input-field {
	width: 100%;
	height: 96rpx;
	padding: 28rpx 20rpx 12rpx; /* 调整内边距 */
	background: transparent;
	border: none;
	font-size: 32rpx;
	color: #1d1d1f;
	box-sizing: border-box;
}

/* 避免 Edge 的原生眼睛：改用文字遮罩 */
.input-field.masked {
	-webkit-text-security: disc;
}

/* 密码输入框特殊处理 */
.input-wrapper:has(.password-toggle) .input-field {
	padding-right: 80rpx; /* 为眼睛图标留出空间 */
}

.input-field:focus {
	outline: none;
}

/* 密码可见性切换按钮 */
.password-toggle {
	position: absolute;
	right: 20rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	z-index: 2;
}

.password-icon {
	width: 36rpx;
	height: 36rpx;
	opacity: 0.6;
	transition: opacity 0.2s ease;
}

.password-toggle:active .password-icon {
	opacity: 0.8;
}

.form-footer {
	text-align: right;
	margin-top: 16rpx;
}

.forgot-link {
	font-size: 28rpx;
	color: #007aff;
	font-weight: 500;
}

/* 操作按钮区域 */
.action-section {
	margin-bottom: 32rpx;
}

.primary-button {
	width: 100%;
	height: 96rpx;
	background: #007aff;
	border: none;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.25);
}

.primary-button:active {
	transform: scale(0.98);
}

.primary-button.disabled {
	background: #d1d1d6;
	box-shadow: none;
	transform: none;
}

.button-text {
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
	letter-spacing: -0.5rpx;
}

.primary-button.disabled .button-text {
	color: #86868b;
}

/* 底部信息 */
.footer {
	margin-top: 32rpx; /* 减少边距，因为容器已经居中 */
}

.footer-text {
	font-size: 24rpx;
	color: #86868b;
	text-align: center;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.container {
		padding: 32rpx 24rpx;
	}
	
	.login-wrapper {
		padding: 32rpx 24rpx;
	}
	
	.segment-text {
		font-size: 26rpx;
	}
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
	.container {
		background: linear-gradient(180deg, #1c1c1e 0%, #000000 100%);
	}
	
	.login-wrapper {
		background: #1c1c1e;
		border-color: rgba(255, 255, 255, 0.1);
	}
	
	.app-title {
		color: #ffffff;
	}
	
	.welcome-text {
		color: #8e8e93;
	}
	
	.segmented-control {
		background: #2c2c2e;
	}
	
	.segment.active {
		background: #3a3a3c;
	}
	
	.segment-text {
		color: #ffffff;
	}
	
	.segment:not(.active) .segment-text {
		color: #8e8e93;
	}
	
	.input-wrapper {
		background: #2c2c2e;
	}
	
	.input-wrapper.focused,
	.input-wrapper.filled:not(.focused) {
		background: #3a3a3c;
		border-color: #48484a;
	}
	
	.input-field {
		color: #ffffff;
	}
	
	.input-label {
		color: #8e8e93;
	}
	
	.primary-button.disabled {
		background: #48484a;
	}
	
	.footer-text {
		color: #8e8e93;
	}
}
</style>