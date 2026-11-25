/* 中医外科学 · 启动 */
(function () {
  'use strict';
  var Z = window.WK, UI = window.WK_UI;
  if (!Z || !UI) return;
  var VER = window.WK_VERSION || { web: '1.0.0' };
  try {
    if (Z.store.meta.ver && Z.store.meta.ver !== VER.web) setTimeout(function () { UI.toast('已更新到 v' + VER.web); }, 600);
    Z.store.meta.ver = VER.web;
    Z.save();
  } catch (e) { }
  /* 新版本 Service Worker 接管后自动刷新一次（避免「下载完了但页面还是旧的」）。
     只在本页加载时就已被 SW 控制的情况下才刷新：首次安装时 clients.claim 也会触发
     controllerchange，那时不该刷新页面。 */
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || window.__wkReloading) return;
      window.__wkReloading = true;
      setTimeout(function () { location.reload(); }, 300);
    });
  }
  /* 版本自愈：如果服务端版本与本地脚本版本不一致，说明缓存/旧包在作怪。
     清掉所有 CacheStorage + 更新 SW，然后只重载一次（用 sessionStorage 防循环）。 */
  (function versionGuard() {
    if (!window.fetch || location.protocol === 'file:') return;
    var key = 'wk_vguard';
    if (sessionStorage.getItem(key) === VER.web) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (v) {
        var remote = String((v && (v.web || v.app)) || '');
        if (!remote || remote === VER.web) return;
        sessionStorage.setItem(key, remote);
        var jobs = [];
        if (window.caches && caches.keys) {
          jobs.push(caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          }));
        }
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); }));
          }));
        }
        Promise.all(jobs).catch(function () {}).then(function () {
          window.__wkReloading = true;
          location.reload();
        });
      }).catch(function () {});
  })();

  UI.tabbar('home');
  function onHash() {
    document.onkeydown = null;
    UI.render();
  }
  window.addEventListener('hashchange', onHash);
  if (!location.hash) { try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; } }
  UI.render();
})();
