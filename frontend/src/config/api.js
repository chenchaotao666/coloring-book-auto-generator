// API 配置 - 连接到外部后端服务
const API_BASE_URL = import.meta.env.MODE === 'development'
  ? import.meta.env.VITE_API_BASE_URL || '' // 开发环境使用环境变量或相对路径
  : import.meta.env.VITE_API_BASE_URL || ''; // 生产环境使用环境变量指向外部后端

// 构建完整的API URL
export const buildApiUrl = (path) => {
  // 如果path已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // 如果API_BASE_URL为空，使用相对路径
  if (!API_BASE_URL) {
    return normalizedPath;
  }

  // 移除API_BASE_URL末尾的斜杠，避免重复
  const baseUrl = API_BASE_URL.replace(/\/$/, '');

  return `${baseUrl}${normalizedPath}`;
};

// 封装fetch函数，自动处理API URL
export const apiFetch = async (path, options = {}) => {
  const url = buildApiUrl(path);

  // 设置默认headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const finalOptions = {
    ...options,
    headers: defaultHeaders
  };

  return fetch(url, finalOptions);
};

// 导出API基础URL供其他地方使用
export { API_BASE_URL };
