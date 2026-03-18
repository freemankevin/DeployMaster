// Service Worker for DeployMaster
const CACHE_NAME = 'deploymaster-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 API 请求
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((fetchResponse) => {
        // 缓存新的静态资源
        if (fetchResponse.ok && fetchResponse.type === 'basic') {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    })
  );
});

// 检查数据更新 - 修复版本，添加错误处理
async function checkForUpdate() {
  try {
    console.log('[SW] Checking for data update...');
    // 使用正确的 API 路径
    const response = await fetch('/api/hosts/stats', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('[SW] Response is not JSON, skipping update check');
      return;
    }

    if (!response.ok) {
      console.log('[SW] Response not OK:', response.status);
      return;
    }

    const data = await response.json();
    console.log('[SW] Data update check completed:', data);

    // 通知所有客户端
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'DATA_UPDATE',
        data: data
      });
    });
  } catch (error) {
    // 静默处理错误，不显示在控制台
    if (error instanceof SyntaxError) {
      console.log('[SW] Expected JSON but got HTML (likely 404 or not authenticated)');
    } else {
      console.log('[SW] Update check failed:', error.message);
    }
  }
}

// 定期检查和消息处理
let checkInterval;

function startPeriodicCheck() {
  // 每 30 秒检查一次
  checkInterval = setInterval(checkForUpdate, 30000);
}

self.addEventListener('message', (event) => {
  if (event.data === 'START_UPDATE_CHECK') {
    console.log('[SW] Starting periodic update check');
    startPeriodicCheck();
  } else if (event.data === 'STOP_UPDATE_CHECK') {
    console.log('[SW] Stopping periodic update check');
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  }
});

// 启动时开始检查
startPeriodicCheck();
