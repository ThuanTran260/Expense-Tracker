import axios from 'axios';

// ─────────────────────────────────────────────
// ACCESS TOKEN — chỉ sống trong memory (module scope)
// Không persist vào localStorage/sessionStorage để thu hẹp bề mặt XSS:
// script độc không đọc được token sau khi trang reload.
// F5 → AuthContext bootstrap gọi /auth/refresh (cookie HttpOnly) để phục hồi.
// ─────────────────────────────────────────────
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Gửi cookies (refreshToken HttpOnly)
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // Timeout sau 10s
});

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR — đính kèm accessToken từ memory
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// CROSS-TAB REFRESH LOCK — Web Locks API
// Bảo đảm cả trình duyệt chỉ chạy 1 request /auth/refresh tại một thời điểm.
// Cookie HttpOnly được browser gắn giá trị MỚI NHẤT lúc gửi nên tab chờ lock
// xong rồi gửi sẽ tự mang token mới nhất → không bao giờ chơi lại token đã rotate
// (server đang bật reuse detection: dùng lại token cũ = thu hồi cả phiên).
// Fallback: Safari cũ không có navigator.locks → chạy không lock (race hiếm, tự hồi phục).
// ─────────────────────────────────────────────
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as unknown as { locks?: { request?: <R>(name: string, cb: () => Promise<R>) => Promise<R> } }).locks;
  if (!locks?.request) {
    return fn();
  }
  return locks.request('auth-refresh', fn);
}

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR — tự động refresh token khi 401
// ─────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: Error | null, token?: string) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu 401 và chưa retry (cờ _retry chặn vòng lặp vô hạn)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đang refresh → queue request lại
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await withRefreshLock(() =>
          axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        );
        const newToken: string = data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
