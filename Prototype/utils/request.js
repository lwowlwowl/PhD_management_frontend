import BASE_URL from './apiConfig.js';

/**
 * 统一请求封装
 * - 自动拼接 BASE_URL
 * - 自动带上 token
 * - 统一处理 401（token 过期，跳回登录页）
 * - 统一处理网络错误
 */
export function request({ url, method = 'GET', data = {} }) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');

    console.log(`[request] ${method} ${url}`, data);

    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        const result = res.data;

        console.log(`[response] ${url}`, result); // 

        // 401：token 过期或无效
        if (result.code === 401) {
          // 清除本地所有登录信息
          uni.clearStorageSync();
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          });
          // 跳回登录页
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' });
          }, 1500);
          return; // 不走 resolve/reject，直接拦截
        }

        resolve(result);
      },
      fail: (err) => {
        // 网络层错误（断网、超时、服务器宕机）
        if (err.errMsg && err.errMsg.includes('timeout')) {
          console.error(`[error] ${url}`, err);
          uni.showToast({ title: '网络连接超时', icon: 'none' });
        } else {
          uni.showToast({ title: '网络错误，请检查网络连接', icon: 'none' });
        }
        reject(err);
      }
    });
  });
}