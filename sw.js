/*
 * どくしょ ちょきんばこ — Service Worker
 *
 * 【重要】activate では自アプリ以外のキャッシュを削除しない。
 *   （学習ログ共通スキーマ仕様書 study.v1 §1.2 禁止事項）
 *   gigayama.github.io は複数アプリで同一オリジンを共有しているため、
 *   CACHE_PREFIX で始まるキャッシュだけを掃除する。
 *
 * また Service Worker は localStorage を操作しない。
 * `study.records.v1` を含む学習データに一切触れない。
 */

const CACHE_PREFIX = 'reading-books-';
const APP_VERSION = '2.1.0';
const CACHE_STATIC = CACHE_PREFIX + 'static-' + APP_VERSION;
const CACHE_RUNTIME = CACHE_PREFIX + 'runtime-v1';

/* アプリシェル。オフラインでも起動できるように必ず先読みする。 */
const PRECACHE_URLS = [
  './',
  './index.html',
  './studyLog.js',
  './manifest.json',
  './vendor/quagga.min.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-64.png'
];

/* 書誌データの取得はキャッシュしない（毎回ネットワークへ通す） */
const BYPASS_HOSTS = [
  'api.openbd.jp',
  'www.googleapis.com',
  'ndlsearch.ndl.go.jp'
];

/* Web フォントは stale-while-revalidate で持っておく */
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      // 1本でも失敗すると addAll 全体が落ちるため、個別に入れる
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[sw] precache skipped', url, err);
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // 自アプリのキャッシュだけを対象にする（他アプリのキャッシュには触れない）
          if (!key.startsWith(CACHE_PREFIX)) return undefined;
          if (key === CACHE_STATIC || key === CACHE_RUNTIME) return undefined;
          return caches.delete(key);
        })
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source && event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
  }
});

/** ネットワーク優先（タイムアウト付き） */
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const res = await fetch(request, { signal: controller.signal });
    if (timer) clearTimeout(timer);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/** キャッシュ優先＋裏で更新 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || network || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (BYPASS_HOSTS.includes(url.hostname)) return; // 書誌 API は素通し

  // ページ遷移：ネットワーク優先。落ちたらキャッシュのアプリシェルを返す
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put('./index.html', preload.clone());
            return preload;
          }
          return await networkFirst(request, CACHE_STATIC, 4000);
        } catch (err) {
          const cache = await caches.open(CACHE_STATIC);
          return (
            (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            new Response('<h1>オフラインです</h1>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503
            })
          );
        }
      })()
    );
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_RUNTIME));
    return;
  }

  // 同一オリジンの静的ファイル：キャッシュ優先＋裏で更新
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
  }
});
