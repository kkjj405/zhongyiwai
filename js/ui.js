/* 中医外科学 · 路由 / 头部 / 底栏 / 弹窗 */
(function () {
  'use strict';
  var esc = window.WK.esc;

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5V20.5"/>',
    bulb: '<path d="M9.5 18h5"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/>',
    quiz: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    me: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    note: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/>',
    hide: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v6h-6"/>',
    tip: '<path d="M12 21s-7-4.4-7-9a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 12c0 4.6-7 9-7 9z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.2" cy="6" r="1"/><circle cx="4.2" cy="12" r="1"/><circle cx="4.2" cy="18" r="1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  var TABS = [
    { id: 'home', hash: '#/home', name: '首页', icon: 'home' },
    { id: 'mat', hash: '#/mat', name: '教材', icon: 'book' },
    { id: 'practice', hash: '#/practice', name: '刷题', icon: 'quiz' },
    { id: 'me', hash: '#/me', name: '我的', icon: 'me' }
  ];
  var VIEWS = {};
  var state = { route: { name: 'home', p: [], q: {} }, tab: 'home' };

  function header(opts) {
    opts = opts || {};
    var h = [];
    if (opts.back) h.push('<button class="hd-btn" id="hd-back" aria-label="返回">' + icon('back') + '</button>');
    h.push('<div class="hd-title">' + (opts.title || '中医外科学') + (opts.sub ? '<small>' + esc(opts.sub) + '</small>' : '') + '</div>');
    (opts.actions || []).forEach(function (a, i) {
      h.push('<button class="hd-btn" data-hact="' + i + '" aria-label="' + esc(a.label || '') + '">' +
        (a.icon ? icon(a.icon) : '') + (a.text ? '<span>' + esc(a.text) + '</span>' : '') + '</button>');
    });
    var el = document.getElementById('hd');
    el.innerHTML = h.join('');
    var b = document.getElementById('hd-back');
    if (b) b.onclick = function () { opts.backTo ? replaceHash(opts.backTo) : back(); };
    (opts.actions || []).forEach(function (a, i) {
      var btn = el.querySelector('[data-hact="' + i + '"]');
      if (btn) btn.onclick = function (e) { e.preventDefault(); a.onClick && a.onClick(); };
    });
  }

  function tabbar(active) {
    state.tab = active || state.tab;
    document.getElementById('tabbar').innerHTML = TABS.map(function (t) {
      return '<a href="' + t.hash + '" class="' + (t.id === state.tab ? 'on' : '') + '">' + icon(t.icon) + '<span>' + t.name + '</span></a>';
    }).join('');
  }

  function parseHash() {
    var h = location.hash || '#/home';
    h = h.replace(/^#\/?/, '');
    var qi = h.indexOf('?'), q = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      });
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', p: parts.slice(1), q: q };
  }

  var TAB_OF = {
    home: 'home', mat: 'mat', catalog: 'mat', card: 'mat',
    practice: 'practice', setup: 'practice', run: 'practice',
    search: 'home', fav: 'me', me: 'me', about: 'me', tip: 'me'
  };

  function render() {
    var r = parseHash();
    state.route = r;
    var v = VIEWS[r.name] || VIEWS.home;
    var main = document.getElementById('main');
    main.className = '';
    main.innerHTML = '';
    window.scrollTo(0, 0);
    document.body.classList.remove('drawer-open');
    try { v(main, r.p, r.q); }
    catch (e) {
      if (window.console) console.error('[view ' + r.name + ']', e);
      main.innerHTML = '<div class="empty"><span class="em-ico">⚠</span>页面出错了<br><span class="tiny">' +
        esc(e && e.message ? e.message : e) + '</span></div>';
      header({ title: '出错' });
    }
    tabbar(TAB_OF[r.name] || 'home');
  }
  function go(hash) { if (location.hash === hash) { render(); return; } location.hash = hash; }
  function replaceHash(hash) {
    if (location.hash === hash) { render(); return; }
    try { history.replaceState(null, '', hash); render(); } catch (e) { location.hash = hash; }
  }
  function back() { if (location.hash && location.hash !== '#/home') history.back(); else go('#/home'); }

  /* ---------- 系统返回键（安卓自带返回 / 侧滑返回） ----------
     优先级：弹窗 → 图片预览 → 路由上一级。返回 true 表示「已处理，别退出 App」。 */
  var UP = {
    catalog: '#/home', card: '#/catalog', mat: '#/home', search: '#/home',
    practice: '#/home', setup: '#/practice', run: '#/practice',
    fav: '#/me', me: '#/home', about: '#/me', tip: '#/me'
  };
  function systemBack() {
    try {
      if (dialogOpen()) { closeDialog(null); return true; }
      if (iv.open) { ivClose(); return true; }
      /* 练习进行中：交给练习模块先弹「退出并保存」确认（返回 true = 已处理） */
      if (typeof window.WK_BACK_GUARD === 'function' && window.WK_BACK_GUARD()) return true;
      var h = location.hash || '#/home';
      if (!h || h === '#/' || h === '#/home') return false;
      var r = parseHash();
      var up = UP[r.name] || '#/home';
      if (history.length > 1) { history.back(); return true; }
      go(up);
      return true;
    } catch (e) { return false; }
  }
  window.DS_BACK = systemBack;
  window.appBack = systemBack;   /* 兼容旧壳子里的名字 */

  var dlgResolve = null;
  function dialog(opts) {
    opts = opts || {};
    var el = document.getElementById('dialog');
    var btns = (opts.buttons && opts.buttons.length) ? opts.buttons : [{ text: '知道了', value: true, primary: true }];
    el.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' +
      (opts.title ? '<h3>' + esc(opts.title) + '</h3>' : '') +
      (opts.html ? '<div class="dtxt">' + opts.html + '</div>' : (opts.text ? '<div class="dtxt">' + esc(opts.text) + '</div>' : '')) +
      '<div class="dact">' + btns.map(function (b, i) {
        return '<button class="btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') +
          '" data-di="' + i + '">' + esc(b.text) + '</button>';
      }).join('') + '</div></div>';
    el.classList.add('on');
    return new Promise(function (resolve) {
      dlgResolve = resolve;
      el.querySelectorAll('[data-di]').forEach(function (b) {
        b.onclick = function () { closeDialog(btns[+b.getAttribute('data-di')].value); };
      });
      el.onclick = function (e) { if (e.target === el && opts.dismissible !== false) closeDialog(null); };
    });
  }
  function closeDialog(v) {
    var el = document.getElementById('dialog');
    el.classList.remove('on'); el.innerHTML = '';
    var r = dlgResolve; dlgResolve = null;
    if (r) r(v);
  }
  function confirmDialog(title, text, okText, cancelText) {
    return dialog({ title: title, text: text,
      buttons: [{ text: cancelText || '取消', value: false }, { text: okText || '确定', value: true, primary: true }] });
  }
  function dialogOpen() { return document.getElementById('dialog').classList.contains('on'); }

  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 1600);
  }
  function emptyBox(text, tip) {
    return '<div class="empty"><span class="em-ico">◌</span>' + esc(text) +
      (tip ? '<div class="tiny" style="margin-top:6px">' + esc(tip) + '</div>' : '') + '</div>';
  }


  /* 全局图片点击放大：任何内容区图片（表格/导图/卡片图/答案图）都支持 */
  (function globalImgZoom() {
    if (window.__ylImgZoom) return;
    window.__ylImgZoom = 1;
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.closest && (t.closest('#imgv') || t.closest('.no-zoom'))) return;
      var src = t.getAttribute('src');
      if (!src) return;
      ev.stopPropagation();
      ev.preventDefault();
      lightbox(src);
    }, true);
  })();

  /* ---------------- 图片查看器（2.4.4） ----------------
   * 手机端要能：✕/点背景/下滑/Esc/系统返回键 都能退出；双指缩放、双击放大、放大后拖动、滚轮缩放。 */
  var iv = { open: false, el: null, stage: null, img: null, s: 1, tx: 0, ty: 0,
    touch: {}, start: null, moved: false, lastTap: 0, swipe: 0 };

  function ivEl() {
    var el = document.getElementById('imgv');
    if (!el) { el = document.createElement('div'); el.id = 'imgv'; document.body.appendChild(el); }
    return el;
  }
  function ivApply() {
    if (!iv.img) return;
    iv.s = Math.max(1, Math.min(4, iv.s));
    iv.img.style.transform = 'translate3d(' + iv.tx + 'px,' + iv.ty + 'px,0) scale(' + iv.s + ')';
    if (iv.stage) iv.stage.classList.toggle('zoomed', iv.s > 1.01);
  }
  function ivReset() { iv.s = 1; iv.tx = 0; iv.ty = 0; ivApply(); }
  function ivBase() {
    /* 未变换时图片左上角在屏幕上的位置（transform-origin 是 0 0，缩放不影响左边） */
    var r = iv.img.getBoundingClientRect();
    return { x: r.left - iv.tx, y: r.top - iv.ty };
  }
  function ivZoomAt(ns, cx, cy) {
    ns = Math.max(1, Math.min(4, ns));
    if (!iv.img) return;
    var E = ivBase();
    iv.tx = cx - E.x - ((cx - E.x - iv.tx) / iv.s) * ns;
    iv.ty = cy - E.y - ((cy - E.y - iv.ty) / iv.s) * ns;
    iv.s = ns;
    ivApply();
  }
  function ivHide() {
    iv.open = false;
    iv.touch = {}; iv.start = null;
    if (iv.el) { iv.el.classList.remove('on'); iv.el.innerHTML = ''; }
    iv.img = null; iv.stage = null;
  }
  function ivClose() {
    if (!iv.open) return;
    ivHide();
    /* 关掉打开图片时压进历史的那一条，避免「返回」把整页退掉 */
    if (history.state && history.state.ivShow) { try { history.back(); } catch (e) { } }
  }
  window.addEventListener('popstate', function () { if (iv.open) ivHide(); });

  function ivPoint(t) { return { x: t.clientX, y: t.clientY }; }
  function ivDist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) || 1; }
  function ivMid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function ivStartFromTouches() {
    var ids = Object.keys(iv.touch);
    if (ids.length >= 2) {
      var a = iv.touch[ids[0]], b = iv.touch[ids[1]];
      var E = iv.img ? ivBase() : { x: 0, y: 0 };
      iv.start = { mode: 'pinch', d0: ivDist(a, b), m0: ivMid(a, b), s0: iv.s, tx0: iv.tx, ty0: iv.ty, E: E };
    } else if (ids.length === 1) {
      var p = iv.touch[ids[0]];
      iv.start = { mode: 'drag', p0: p, tx0: iv.tx, ty0: iv.ty, s0: iv.s, t: Date.now(), moved: false };
    }
    iv.moved = false;
  }

  function lightbox(src) {
    var el = ivEl();
    iv.el = el;
    el.innerHTML = '<div class="iv-stage"><img src="' + esc(src) + '" alt=""></div>' +
      '<button class="iv-close" type="button" aria-label="关闭图片">✕ 关闭</button>' +
      '<div class="iv-hint">双指缩放 · 双击放大 · 下滑或点空白处关闭</div>';
    el.classList.add('on');
    iv.open = true;
    iv.s = 1; iv.tx = 0; iv.ty = 0;
    iv.touch = {}; iv.start = null; iv.lastTap = 0;
    iv.stage = el.querySelector('.iv-stage');
    iv.img = el.querySelector('img');
    ivApply();
    if (iv.img && iv.img.decode) iv.img.decode().then(ivApply, function () { });
    try { history.pushState({ ivShow: 1 }, ''); } catch (e) { }

    el.querySelector('.iv-close').onclick = function (ev) { ev.stopPropagation(); ivClose(); };

    iv.stage.addEventListener('touchstart', function (ev) {
      for (var i = 0; i < ev.touches.length; i++) {
        var t = ev.touches[i];
        iv.touch[t.identifier] = ivPoint(t);
      }
      ivStartFromTouches();
    }, { passive: true });

    iv.stage.addEventListener('touchmove', function (ev) {
      ev.preventDefault();
      for (var i = 0; i < ev.touches.length; i++) {
        var t = ev.touches[i];
        if (iv.touch[t.identifier]) iv.touch[t.identifier] = ivPoint(t);
      }
      var st = iv.start;
      if (!st) return;
      var ids = Object.keys(iv.touch);
      if (st.mode === 'pinch' && ids.length >= 2) {
        var a = iv.touch[ids[0]], b = iv.touch[ids[1]];
        var d = ivDist(a, b), m = ivMid(a, b);
        var s = Math.max(1, Math.min(4, st.s0 * d / st.d0));
        var kk = s / st.s0;
        iv.tx = m.x - st.E.x - (st.m0.x - st.E.x - st.tx0) * kk;
        iv.ty = m.y - st.E.y - (st.m0.y - st.E.y - st.ty0) * kk;
        iv.s = s;
        ivApply();
        iv.moved = true;
      } else if (st.mode === 'drag' && ids.length === 1) {
        var p = iv.touch[ids[0]];
        var dx = p.x - st.p0.x, dy = p.y - st.p0.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { iv.moved = true; st.moved = true; }
        if (st.s0 > 1.01) {
          iv.tx = st.tx0 + dx; iv.ty = st.ty0 + dy; ivApply();
        } else if (dy > 0) {
          iv.ty = dy * 0.7; iv.swipe = dy; ivApply();      /* 未放大时下滑 = 关闭手势 */
        }
      }
    }, { passive: false });

    function ivEnd(ev) {
      var st = iv.start;
      var ids = Object.keys(iv.touch);
      for (var i = 0; i < ev.changedTouches.length; i++) delete iv.touch[ev.changedTouches[i].identifier];
      var left = Object.keys(iv.touch).length;
      if (st && st.mode === 'drag' && !st.moved) {
        /* 轻点：判断双击放大 / 点空白关闭 */
        var now = Date.now();
        var target = ev.target;
        if (now - iv.lastTap < 320) {
          iv.lastTap = 0;
          if (iv.s > 1.01) ivReset();
          else {
            var t = (ev.changedTouches && ev.changedTouches[0]) || {};
            ivZoomAt(2.5, t.clientX || window.innerWidth / 2, t.clientY || window.innerHeight / 2);
          }
          return;
        }
        iv.lastTap = now;
        if (iv.s <= 1.01 && target === iv.stage) { ivClose(); return; }
      }
      if (st && st.mode === 'drag' && st.s0 <= 1.01 && iv.swipe > 90) { ivClose(); return; }
      if (left === 0) {
        iv.swipe = 0;
        if (iv.s <= 1.01 && (Math.abs(iv.tx) > 1 || Math.abs(iv.ty) > 1)) { iv.tx = 0; iv.ty = 0; ivApply(); }
        iv.start = null;
      } else {
        ivStartFromTouches();          /* 两指撤一指：重新以剩下那指为拖动基准 */
      }
    }
    iv.stage.addEventListener('touchend', ivEnd);
    iv.stage.addEventListener('touchcancel', ivEnd);

    /* 桌面端：滚轮缩放 / 双击（拖拽与点空白关闭在模块级注册一次） */
    iv.stage.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var step = ev.deltaY < 0 ? 1.18 : 1 / 1.18;
      ivZoomAt(iv.s * step, ev.clientX, ev.clientY);
    }, { passive: false });
    iv.stage.addEventListener('dblclick', function (ev) {
      if (iv.s > 1.01) ivReset(); else ivZoomAt(2.5, ev.clientX, ev.clientY);
    });
  }

  /* 桌面端拖拽 / 点空白关闭：只注册一次 */
  var ivDrag = null;
  document.addEventListener('mousedown', function (ev) {
    if (!iv.open || ev.button !== 0 || !iv.stage || !iv.stage.contains(ev.target)) return;
    ivDrag = { x: ev.clientX, y: ev.clientY, tx: iv.tx, ty: iv.ty, moved: false };
  });
  document.addEventListener('mousemove', function (ev) {
    if (!ivDrag || !iv.open) return;
    var dx = ev.clientX - ivDrag.x, dy = ev.clientY - ivDrag.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) ivDrag.moved = true;
    if (iv.s > 1.01) { iv.tx = ivDrag.tx + dx; iv.ty = ivDrag.ty + dy; ivApply(); }
  });
  document.addEventListener('mouseup', function (ev) {
    if (!ivDrag || !iv.open) return;
    var wasMoved = ivDrag.moved; ivDrag = null;
    if (!wasMoved && ev.target === iv.stage && iv.s <= 1.01) ivClose();
  });

  document.addEventListener('keydown', function (ev) {
    if (!iv.open) return;
    if (ev.key === 'Escape') ivClose();
    if (iv.s > 1.01 && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
      iv.tx += (ev.key === 'ArrowLeft' ? 60 : -60); ivApply();
    }
  });

  window.WK_UI = {
    lightbox: lightbox,
    ICONS: ICONS, icon: icon, TABS: TABS, VIEWS: VIEWS, state: state,
    header: header, tabbar: tabbar, render: render, go: go, replaceHash: replaceHash, back: back,
    dialog: dialog, closeDialog: closeDialog, confirmDialog: confirmDialog, dialogOpen: dialogOpen,
    toast: toast, emptyBox: emptyBox, parseHash: parseHash
  };
})();
