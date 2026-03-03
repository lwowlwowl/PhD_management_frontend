<script>
	import { wsManager } from '@/pages/teacher/teacher_API.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 如果已经是登录状态的 teacher/admin，恢复 WebSocket 连接
			const token = uni.getStorageSync('token')
			const role = uni.getStorageSync('userRole')
			if (token && role === 'teacher') {
				wsManager.connect(token)
			}
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
