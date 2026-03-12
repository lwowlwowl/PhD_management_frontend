import { request } from '../../utils/request.js';

// 登录接口封装
export function loginApi(data) {
  return request({
    url: '/api/users/login',
    method: 'POST',
    data
  });
}