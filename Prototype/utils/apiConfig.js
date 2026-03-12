let BASE_URL = '';

// H5 开发环境走同源路径，由 Vite 代理转发到后端，避免浏览器 CORS。
// #ifdef H5
BASE_URL = '';
// #endif

// 非 H5 端（如小程序、App）继续直连后端地址。
// #ifndef H5
BASE_URL = 'http://localhost:8080';
// #endif

export default BASE_URL;
