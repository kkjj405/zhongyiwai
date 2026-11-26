/* 中医外科学 · Service Worker（离线优先；核心与导图分缓存）
 * 版本：1.0.0　核心 19 项　导图 197 项
 * 本文件由 build_pwa.py 生成，勿手改。
 */
const CORE = 'zwk-zhongyiwai-v1.0.0';
const IMG = 'zwk-zhongyiwai-img-e5f7fd1c11';
const CORE_ASSETS = [
  "./app.css",
  "./index.html",
  "./manifest.webmanifest",
  "./qr.jpg",
  "./selftest.html",
  "./css/practice.css",
  "./data/material.js",
  "./data/practice.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./js/boot.js",
  "./js/cards.js",
  "./js/core.js",
  "./js/misc.js",
  "./js/practiceview.js",
  "./js/ui.js",
  "./js/version.js"
];
const IMG_ASSETS = [
  "./img/fig/f0601.jpg",
  "./img/fig/f1001.jpg",
  "./img/fig/f1002.jpg",
  "./img/fig/f1003.jpg",
  "./img/fig/f1004.jpg",
  "./img/fig/f1005.jpg",
  "./img/fig/f1006.jpg",
  "./img/fig/f1007.jpg",
  "./img/fig/f1008.jpg",
  "./img/fig/f1009.jpg",
  "./img/fig/f1010.jpg",
  "./img/fig/f1101.jpg",
  "./img/fig/f1102.jpg",
  "./img/fig/f1103.jpg",
  "./img/fig/f1104.jpg",
  "./img/fig/f1105.jpg",
  "./img/fig/f1106.jpg",
  "./img/fig/f1107.jpg",
  "./img/fig/f1108.jpg",
  "./img/fig/f1109.jpg",
  "./img/fig/f1110.jpg",
  "./img/fig/f1111.jpg",
  "./img/fig/f1112.jpg",
  "./img/fig/f1113.jpg",
  "./img/fig/f1114.jpg",
  "./img/fig/f1115.jpg",
  "./img/fig/f1116.jpg",
  "./img/fig/f1117.jpg",
  "./img/fig/f1118.jpg",
  "./img/fig/f1119.jpg",
  "./img/fig/f1120.jpg",
  "./img/fig/f1121.jpg",
  "./img/fig/f1122.jpg",
  "./img/fig/f1123.jpg",
  "./img/fig/f1124.jpg",
  "./img/fig/f1125.jpg",
  "./img/fig/f1126.jpg",
  "./img/fig/f1127.jpg",
  "./img/fig/f1128.jpg",
  "./img/fig/f1129.jpg",
  "./img/fig/f1130.jpg",
  "./img/fig/f1131.jpg",
  "./img/fig/f1132.jpg",
  "./img/fig/f1133.jpg",
  "./img/fig/f1134.jpg",
  "./img/fig/f1135.jpg",
  "./img/fig/f1136.jpg",
  "./img/fig/f1137.jpg",
  "./img/fig/f1138.jpg",
  "./img/fig/f1139.jpg",
  "./img/fig/f1140.jpg",
  "./img/fig/f1141.jpg",
  "./img/fig/f1142.jpg",
  "./img/fig/f1143.jpg",
  "./img/fig/f1144.jpg",
  "./img/fig/f1145.jpg",
  "./img/fig/f1146.jpg",
  "./img/fig/f1147.jpg",
  "./img/fig/f1148.jpg",
  "./img/fig/f1149.jpg",
  "./img/fig/f1301.jpg",
  "./img/fig/f1302.jpg",
  "./img/fig/f1401.jpg",
  "./img/fig/f1402.jpg",
  "./img/fig/f1403.jpg",
  "./img/fig/f1404.jpg",
  "./img/fig/f1405.jpg",
  "./img/tab/t0601.jpg",
  "./img/tab/t0602.jpg",
  "./img/tab/t0603.jpg",
  "./img/tab/t0604.jpg",
  "./img/tab/t0605.jpg",
  "./img/tab/t0606.jpg",
  "./img/tab/t0606b.jpg",
  "./img/tab/t0607.jpg",
  "./img/tab/t0608.jpg",
  "./img/tab/t0609.jpg",
  "./img/tab/t0610.jpg",
  "./img/tab/t0611.jpg",
  "./img/tab/t0612.jpg",
  "./img/tab/t0613.jpg",
  "./img/tab/t0614.jpg",
  "./img/tab/t0615.jpg",
  "./img/tab/t0616.jpg",
  "./img/tab/t0617.jpg",
  "./img/tab/t0618.jpg",
  "./img/tab/t0619.jpg",
  "./img/tab/t0620.jpg",
  "./img/tab/t0621.jpg",
  "./img/tab/t0622.jpg",
  "./img/tab/t0622b.jpg",
  "./img/tab/t0623.jpg",
  "./img/tab/t0623b.jpg",
  "./img/tab/t0624.jpg",
  "./img/tab/t0625.jpg",
  "./img/tab/t0701.jpg",
  "./img/tab/t0702.jpg",
  "./img/tab/t0703.jpg",
  "./img/tab/t0704.jpg",
  "./img/tab/t0705.jpg",
  "./img/tab/t0706.jpg",
  "./img/tab/t0801.jpg",
  "./img/tab/t0802.jpg",
  "./img/tab/t0803.jpg",
  "./img/tab/t0804.jpg",
  "./img/tab/t0901.jpg",
  "./img/tab/t0902.jpg",
  "./img/tab/t0903.jpg",
  "./img/tab/t0904.jpg",
  "./img/tab/t0905.jpg",
  "./img/tab/t1001.jpg",
  "./img/tab/t1002.jpg",
  "./img/tab/t1003.jpg",
  "./img/tab/t1004.jpg",
  "./img/tab/t1005.jpg",
  "./img/tab/t1006.jpg",
  "./img/tab/t1007.jpg",
  "./img/tab/t1008.jpg",
  "./img/tab/t1009.jpg",
  "./img/tab/t1010.jpg",
  "./img/tab/t1011.jpg",
  "./img/tab/t1012.jpg",
  "./img/tab/t1013.jpg",
  "./img/tab/t1013b.jpg",
  "./img/tab/t1014.jpg",
  "./img/tab/t1014b.jpg",
  "./img/tab/t1015.jpg",
  "./img/tab/t1016.jpg",
  "./img/tab/t1017.jpg",
  "./img/tab/t1018.jpg",
  "./img/tab/t1019.jpg",
  "./img/tab/t1019b.jpg",
  "./img/tab/t1020.jpg",
  "./img/tab/t1021.jpg",
  "./img/tab/t1022.jpg",
  "./img/tab/t1023.jpg",
  "./img/tab/t1024.jpg",
  "./img/tab/t1025.jpg",
  "./img/tab/t1026.jpg",
  "./img/tab/t1027.jpg",
  "./img/tab/t1028.jpg",
  "./img/tab/t1029.jpg",
  "./img/tab/t1030.jpg",
  "./img/tab/t1030b.jpg",
  "./img/tab/t1031.jpg",
  "./img/tab/t1032.jpg",
  "./img/tab/t1033.jpg",
  "./img/tab/t1034.jpg",
  "./img/tab/t1035.jpg",
  "./img/tab/t1101.jpg",
  "./img/tab/t1102.jpg",
  "./img/tab/t1103.jpg",
  "./img/tab/t1104.jpg",
  "./img/tab/t1105.jpg",
  "./img/tab/t1105b.jpg",
  "./img/tab/t1106.jpg",
  "./img/tab/t1107.jpg",
  "./img/tab/t1108.jpg",
  "./img/tab/t1109.jpg",
  "./img/tab/t1110.jpg",
  "./img/tab/t1111.jpg",
  "./img/tab/t1112.jpg",
  "./img/tab/t1201.jpg",
  "./img/tab/t1202.jpg",
  "./img/tab/t1203.jpg",
  "./img/tab/t1204.jpg",
  "./img/tab/t1205.jpg",
  "./img/tab/t1205b.jpg",
  "./img/tab/t1206.jpg",
  "./img/tab/t1207.jpg",
  "./img/tab/t1208.jpg",
  "./img/tab/t1209.jpg",
  "./img/tab/t1209b.jpg",
  "./img/tab/t1210.jpg",
  "./img/tab/t1211.jpg",
  "./img/tab/t1212.jpg",
  "./img/tab/t1213.jpg",
  "./img/tab/t1214.jpg",
  "./img/tab/t1214b.jpg",
  "./img/tab/t1301.jpg",
  "./img/tab/t1302.jpg",
  "./img/tab/t1303.jpg",
  "./img/tab/t1304.jpg",
  "./img/tab/t1305.jpg",
  "./img/tab/t1306.jpg",
  "./img/tab/t1307.jpg",
  "./img/tab/t1308.jpg",
  "./img/tab/t1309.jpg",
  "./img/tab/t1401.jpg",
  "./img/tab/t1402.jpg",
  "./img/tab/t1403.jpg",
  "./img/tab/t1404.jpg",
  "./img/tab/t1405.jpg",
  "./img/tab/t1406.jpg",
  "./img/tab/t1407.jpg",
  "./img/tab/t1408.jpg",
  "./img/tab/t1409.jpg"
];

/* 逐项预缓存：本缓存里已有就跳过（旧版本里同名资源直接复用，不重复下载） */
async function precache(cacheName, urls) {
  const c = await caches.open(cacheName);
  await Promise.all(urls.map(async function (u) {
    try {
      const hit = await c.match(u, { ignoreSearch: true });
      if (hit) return;
      await c.add(new Request(u, { cache: 'reload' }));
    } catch (e) { /* 单个失败不阻塞安装，运行时会自然回填 */ }
  }));
}

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    await precache(IMG, IMG_ASSETS);     // 图片没变时这里几乎零下载
    await precache(CORE, CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keep = { [CORE]: 1, [IMG]: 1 };
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      if (keep[k]) return null;
      if (k.indexOf('__probe__') === 0) return null;
      return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域不接管
  if (/(^|\/)(version|files)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(new Request(req, { cache: 'no-store' })));
    return;
  }
  /* 数据文件（教材/要点/题库）：网络优先，拿到就回填缓存——
     避免「换了新版本但页面还在用旧 data/*.js」的问题 */
  if (/\/data\/[^/]+\.js$/.test(url.pathname)) {
    e.respondWith(
      fetch(new Request(req, { cache: 'no-store' })).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CORE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CORE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
