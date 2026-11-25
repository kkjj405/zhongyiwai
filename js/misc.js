/* 中医外科学 · 首页 / 搜索 / 收藏 / 我的 / 关于 / 打赏 */
(function () {
  'use strict';
  var Z = window.WK, UI = window.WK_UI;
  var esc = Z.esc, icon = UI.icon;
  var VER = window.WK_VERSION || { web: '1.0.0' };

  var ANN = [
    '本程序内容基于中国中医药出版社《中医外科学》（第六版），仅供学习使用，不提供临床诊疗指导；用药请遵医嘱。',
    '教材卡片按「章 → 病证」折叠目录整理，每张病证卡内按【病因病机】【辨病】【治疗】【预防调护】分页，左右滑动或点页签翻页。',
    '原书插图与鉴别表以扫描裁图保留，可点开放大。',
    '制作不易，若觉得有用可以分享给同学；也可以去「我的 → 赞赏支持」给作者一点鼓励，完全自愿。'
  ];

  /* 封面装饰线稿：银针 + 药捻 + 膏药贴（自己画的，纯装饰） */
  var HERO_SVG = '<svg viewBox="0 0 200 170" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="100" cy="86" r="62" opacity=".28"/><circle cx="100" cy="86" r="46" opacity=".2"/>' +
    '<path d="M72 30 L112 118" opacity=".85"/><path d="M68 26 L76 24 L80 33 L72 35 Z" opacity=".85"/>' +
    '<path d="M112 118 c-6 8 -16 10 -22 6" opacity=".85"/>' +
    '<rect x="112" y="44" width="46" height="30" rx="6" opacity=".8"/>' +
    '<path d="M118 52h34M118 60h34M118 68h22" opacity=".45"/>' +
    '<path d="M46 108c10-6 20-6 30 0M46 120c10-6 20-6 30 0" opacity=".5"/>' +
    '<path d="M52 82h22M63 71v22" opacity=".35"/></svg>';

  function annHTML() {
    var open = Z.store.meta.annOpen !== false;
    return '<div class="announce' + (open ? ' open' : '') + '" id="ann"><button class="ann-hd" id="ann-hd" type="button">' +
      '<span class="ann-ic">告</span><span class="ann-t">公告</span>' +
      '<span class="ann-x" id="ann-x">' + (open ? '收起' : '展开') + '</span></button><div class="ann-bd">' +
      ANN.map(function (x, i) { return '<div class="ann-i"><span class="ann-no">' + (i + 1) + '.</span><span>' + esc(x) + '</span></div>'; }).join('') +
      '</div></div>';
  }

  function renderHome(main) {
    UI.header({ title: '中医外科学' });
    var ms = Z.MAT.stats || {};
    var qs = Z.QB.stats || {};
    var nExam = Z.examDiseases().length;
    var h = ['<div class="hero">' +
      '<div class="hero-art">' + HERO_SVG + '</div>' +
      '<div class="hero-seal serif" aria-hidden="true">疡</div>' +
      '<h1 class="hero-t serif">中医外科学</h1>' +
      '<div class="hero-en">SURGERY OF CHINESE MEDICINE</div>' +
      '<p class="hero-d">教材卡片 · 原书图表 · 默写练习 · 选择题</p>' +
      '<div class="hero-src">中国中医药出版社《中医外科学》第六版</div>' +
      '<div class="hero-stats">' +
      '<div class="hs"><b>' + (ms.cards || 0) + '</b><span>张卡片</span></div>' +
      '<div class="hs"><b>' + ((ms.figs || 0) + (ms.tables || 0)) + '</b><span>张图表</span></div>' +
      '<div class="hs"><b>' + (ms.diseases || nExam || 0) + '</b><span>个病证</span></div>' +
      '</div></div>'];
    h.push(annHTML());
    h.push('<div class="big-grid">' +
      '<a class="big" href="#/mat"><div class="big-ic">' + icon('book') + '</div><div class="big-t">教材卡片</div>' +
      '<div class="big-s">' + (ms.chapters || 0) + ' 章 · ' + (ms.diseases || 0) + ' 个病证<br>章 / 病证 / 子病证 / 附病</div></a>' +
      '<a class="big" href="#/practice"><div class="big-ic">' + icon('quiz') + '</div><div class="big-t">默写 · 选择题</div>' +
      '<div class="big-s">' + (qs.syndromes || 0) + ' 个证型<br>按病证勾选范围 · 自动存草稿</div></a>' +
      '<a class="big" href="#/search"><div class="big-ic">' + icon('search') + '</div><div class="big-t">搜索</div>' +
      '<div class="big-s">病证 / 证型 / 方剂 / 正文<br>全书可搜</div></a></div>');
    var favN = Object.keys(Z.store.fav).length;
    var draftN = (Z.store.drafts || []).length;
    h.push('<div class="card list"><a class="li" href="#/fav"><span class="li-ic">' + icon('star') + '</span>' +
      '<span class="grow"><span class="li-t">我的收藏</span><span class="li-s">教材卡片 ' + favN + ' 张</span></span><span class="at-go">›</span></a>' +
      '<a class="li" href="#/practice"><span class="li-ic">' + icon('refresh') + '</span><span class="grow"><span class="li-t">未完成练习</span>' +
      '<span class="li-s">' + (draftN ? '草稿 ' + draftN + ' 份 · 点此继续' : '暂无草稿，中途退出会自动保存') + '</span></span><span class="at-go">›</span></a></div>');
    main.innerHTML = h.join('');
    var ann = main.querySelector('#ann-hd');
    if (ann) ann.onclick = function () {
      var box = main.querySelector('#ann');
      var open = !box.classList.contains('open');
      box.classList.toggle('open', open);
      Z.store.meta.annOpen = open; Z.save();
      var x = box.querySelector('#ann-x'); if (x) x.textContent = open ? '收起' : '展开';
    };
  }

  /* ---------------- 搜索：分组（名字 / 小节标题 / 正文） ---------------- */
  function renderSearch(main, p, q) {
    UI.header({ title: '搜索', back: true });
    main.innerHTML = '<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="s-kw" placeholder="病证名 / 证型 / 方剂 / 正文关键词" value="' + esc((q && q.kw) || '') + '" autocomplete="off"></div>' +
      '<div id="s-res"></div>';
    var inp = main.querySelector('#s-kw'), box = main.querySelector('#s-res');
    var timer = null, composing = false;
    var showAll = { sub: false, body: false };

    function hl(text, kw) {
      var t = String(text == null ? '' : text), k = String(kw || '');
      if (!k) return esc(t);
      var i = t.toLowerCase().indexOf(k.toLowerCase());
      if (i < 0) return esc(t);
      return esc(t.slice(0, i)) + '<em class="hl">' + esc(t.slice(i, i + k.length)) + '</em>' + esc(t.slice(i + k.length));
    }
    var BADGE = { card: '卡', syndrome: '证', formula: '方', page: '文', sub: '节' };
    function badge(t) {
      var cls = (t === 'formula') ? 'intro' : (t === 'syndrome' || t === 'page') ? 'sub' : 'topic';
      return '<span class="er-kind ' + cls + '">' + (BADGE[t] || '卡') + '</span>';
    }
    function nameRow(it, kw) {
      var inner = badge(it.type) + '<span class="er-nm">' + hl(it.name, kw) +
        (it.sub ? '<span class="sr-ctx">' + esc(it.sub) + '</span>' : '') + '</span>';
      return it.href ? '<a class="er" href="' + esc(it.href) + '">' + inner + '</a>'
        : '<div class="er" style="cursor:default">' + inner + '</div>';
    }
    function subRow(it, kw) {
      return '<a class="er" href="' + esc(it.href) + '">' + badge(it.type) +
        '<span class="er-nm">' + hl(it.name, kw) +
        '<span class="sr-snip">…' + hl(it.hit, kw) + '…</span>' +
        '<span class="sr-ctx">' + esc(it.sub) + '</span></span></a>';
    }
    function bodyRow(it, kw) {
      var sn = it.snip || { pre: '', mid: '', post: '' };
      return '<a class="er" href="' + esc(it.href) + '">' + badge(it.type) +
        '<span class="er-nm">' + hl(it.name, kw) +
        '<span class="sr-snip">' + esc(sn.pre) + '<em class="hl">' + esc(sn.mid) + '</em>' + esc(sn.post) + '</span>' +
        '<span class="sr-ctx">' + esc(it.sub) + (it.n > 1 ? ' · 出现 ' + it.n + ' 次' : '') + '</span></span></a>';
    }
    function grp(title) { return '<div class="sr-grp">' + title + '</div>'; }
    function card(rows) { return '<div class="card flat" style="padding:2px 0">' + rows.join('') + '</div>'; }
    function moreBtn(n, what, total) {
      return '<button class="btn sm sr-more" data-more="' + what + '">展开其余 ' + (total - n) + ' 条</button>';
    }

    function draw() {
      var kw = inp.value.trim();
      if (!kw) {
        box.innerHTML = '<div class="card flat"><p class="small muted" style="margin:0">输入病证（如 疖）、证型（如 热毒蕴结）、方剂（如 五味消毒饮）或正文关键词（如 清热解毒）。</p></div>';
        return;
      }
      var r = Z.searchAll(kw);
      var out = [];
      var total = r.cards.length + r.syns.length + r.formulas.length + r.pages.length + r.subs.length;
      if (!total) {
        box.innerHTML = UI.emptyBox('没有找到「' + kw + '」', '换个说法，或只输入前两个字试试');
        return;
      }
      if (r.cards.length) {
        out.push(grp('病证卡片 · ' + r.cards.length));
        out.push(card(r.cards.slice(0, 40).map(function (it) { return nameRow(it, kw); })));
      }
      if (r.syns.length) {
        out.push(grp('证型 · ' + r.syns.length));
        out.push(card(r.syns.slice(0, 20).map(function (it) { return nameRow(it, kw); })));
      }
      if (r.formulas.length) {
        out.push(grp('方剂 · ' + r.formulas.length));
        out.push(card(r.formulas.slice(0, 20).map(function (it) { return nameRow(it, kw); })));
      }
      if (r.subs.length) {
        var limS = showAll.sub ? r.subs.length : Math.min(r.subs.length, 8);
        out.push(grp('页内小标题命中 · ' + r.subs.length));
        out.push(card(r.subs.slice(0, limS).map(function (it) { return subRow(it, kw); })));
        if (!showAll.sub && r.subs.length > limS) out.push(moreBtn(limS, 'sub', r.subs.length));
      }
      if (r.pages.length) {
        var lim = showAll.body ? r.pages.length : Math.min(r.pages.length, 10);
        out.push(grp('正文提到 · ' + r.pages.length));
        out.push(card(r.pages.slice(0, lim).map(function (it) { return bodyRow(it, kw); })));
        if (!showAll.body && r.pages.length > lim) out.push(moreBtn(lim, 'body', r.pages.length));
      }
      box.innerHTML = out.join('');
    }

    box.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('.sr-more') : null;
      if (!b) return;
      ev.preventDefault();
      showAll[b.getAttribute('data-more')] = true;
      draw();
    });

    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () { composing = false; draw(); });
    inp.oninput = function () {
      if (composing) return;
      showAll.sub = false; showAll.body = false;
      clearTimeout(timer); timer = setTimeout(draw, 180);
    };
    draw();   /* 带 ?kw= 直接进来（首页搜索）时先跑一次 */
  }

  /* ---------------- 收藏（卡片级） ---------------- */
  function renderFav(main) {
    UI.header({ title: '我的收藏', sub: '病证卡片', back: true, backTo: '#/me' });
    var cards = Z.favCards();
    var h = [];
    if (!cards.length) {
      h.push(UI.emptyBox('还没有收藏', '在病证卡片里点「收藏」即可'));
    } else {
      var byCh = {};
      cards.forEach(function (c) { (byCh[c.chapterId] = byCh[c.chapterId] || []).push(c); });
      h.push('<div class="tiny dim" style="margin:2px 4px 6px">病证卡片 · ' + cards.length + ' 张</div>');
      Z.chapters.forEach(function (ch) {
        var list = byCh[ch.id];
        if (!list || !list.length) return;
        h.push('<div class="sr-grp">' + esc((ch.no || '') + ' ' + (ch.name || '')) + '</div>');
        h.push('<div class="card flat" style="padding:2px 0">' + list.map(function (c) {
          return '<div class="er" style="cursor:default"><a class="er-nm" href="#/card/' + c.id +
            '" style="text-decoration:none;color:inherit">' + esc(c.displayName || c.name) +
            '</a><button class="btn xs danger" data-uf="' + c.id + '">取消</button></div>';
        }).join('') + '</div>');
      });
    }
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-uf]').forEach(function (b) {
      b.onclick = function () { Z.toggleFav(b.getAttribute('data-uf')); UI.render(); };
    });
  }

  /* ---------------- 我的 ---------------- */
  function renderMe(main) {
    UI.header({ title: '我的' });
    var ms = Z.MAT.stats || {}, qs = Z.QB.stats || {};
    var favN = Object.keys(Z.store.fav).length;
    var h = ['<div class="card me-card"><div class="me-av">疡</div><div class="grow"><div class="me-nm">中医外科学</div>' +
      '<div class="tiny dim">v' + esc(VER.web) + ' · ' + (ms.diseases || 0) + ' 个病证 · ' + (qs.syndromes || 0) + ' 个证型</div></div></div>'];
    h.push('<div class="card list">' +
      '<a class="li" href="#/fav"><span class="li-ic">' + icon('star') + '</span><span class="grow"><span class="li-t">教材卡片收藏</span>' +
      '<span class="li-s">' + favN + ' 张</span></span><span class="at-go">›</span></a>' +
      '<a class="li" href="#/practice"><span class="li-ic">' + icon('quiz') + '</span><span class="grow"><span class="li-t">默写 / 选择题</span>' +
      '<span class="li-s">练习与未完成草稿</span></span><span class="at-go">›</span></a></div>');
    h.push('<div class="card list">' +
      '<div class="li"><span class="li-ic">' + icon('refresh') + '</span><span class="grow"><span class="li-t">检查更新</span>' +
      '<span class="li-s" id="upd-msg">点右侧按钮检查</span></span><button class="btn xs" id="upd-btn">检查</button>' +
      '<button class="btn xs ghost" id="upd-hard">强制刷新</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('note') + '</span><span class="grow"><span class="li-t">备份与恢复</span>' +
      '<span class="li-s">导出/导入本机记录</span></span><button class="btn xs" id="bk-out">导出</button><button class="btn xs" id="bk-in">导入</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('hide') + '</span><span class="grow"><span class="li-t">清空本机数据</span>' +
      '<span class="li-s">笔记 / 收藏 / 草稿 / 练习记录</span></span><button class="btn xs danger" id="clr">清空</button></div></div>');
    h.push('<div class="card list"><a class="li" href="#/about"><span class="li-ic">' + icon('list') + '</span>' +
      '<span class="grow"><span class="li-t">关于</span><span class="li-s">数据来源与免责声明</span></span><span class="at-go">›</span></a>' +
      '<a class="li" href="#/tip"><span class="li-ic">' + icon('tip') + '</span><span class="grow"><span class="li-t">赞赏支持</span>' +
      '<span class="li-s">自愿 · 随意</span></span><span class="at-go">›</span></a></div>');
    main.innerHTML = h.join('');
    main.querySelector('#upd-btn').onclick = function () { checkUpdate(main); };
    main.querySelector('#upd-hard').onclick = function () { hardRefresh(main); };
    main.querySelector('#bk-out').onclick = exportAll;
    main.querySelector('#bk-in').onclick = importAll;
    main.querySelector('#clr').onclick = function () {
      UI.confirmDialog('清空本机数据', '将删除笔记、收藏、练习草稿与练习记录，不可恢复。确定？', '清空', '取消').then(function (ok) {
        if (!ok) return;
        try { localStorage.removeItem('wk.data.v1'); } catch (e) { }
        UI.toast('已清空'); setTimeout(function () { location.reload(); }, 600);
      });
    };
  }

  function cmp(a, b) {
    var x = String(a || '0').split('.'), y = String(b || '0').split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var p = parseInt(x[i] || 0, 10), q = parseInt(y[i] || 0, 10);
      if (p !== q) return p > q ? 1 : -1;
    }
    return 0;
  }
  /* ---------------- 检查更新 / 强制刷新 ----------------
     下载期间分段提示；等新 SW 真正 installed 再刷新；另给「强制刷新」兜底。 */
  var updating = false;
  function sayIn(main, t) {
    var m = main && main.querySelector('#upd-msg');
    if (m) m.textContent = t;
  }
  function waitSwInstalled(reg, ms) {
    return new Promise(function (resolve) {
      var w = reg.installing || reg.waiting;
      if (!w) { resolve('none'); return; }
      if (w.state === 'installed' || w.state === 'activated') { resolve(w.state); return; }
      var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve('timeout'); } }, ms || 30000);
      w.addEventListener('statechange', function () {
        if (done) return;
        if (w.state === 'installed' || w.state === 'activated' || w.state === 'redundant') {
          done = true; clearTimeout(timer); resolve(w.state);
        }
      });
    });
  }
  function reloadOnce() {
    if (window.__wkReloading) return;
    window.__wkReloading = true;
    location.reload();
  }
  function hardRefresh(main) {
    if (hasNative() && typeof window.NativeBridge.repair === 'function') {
      UI.confirmDialog('强制刷新',
        '将丢弃已下载的热更新资源，回到随 App 内置的版本。本机的笔记、收藏、练习草稿不受影响。\n' +
        '一般用不到；只有在「检查更新」反复无效时才需要。', '刷新', '取消').then(function (ok) {
          if (!ok) return;
          sayIn(main, '正在清理…');
          try { window.NativeBridge.repair(); } catch (e) { UI.toast('清理失败'); }
        });
      return;
    }
    UI.confirmDialog('强制刷新',
      '将注销离线缓存并重新下载全部资源（约 5~8 MB）。本机的笔记、收藏、练习草稿不受影响。\n' +
      '一般用不到；只有在「检查更新」反复无效时才需要。', '刷新', '取消').then(function (ok) {
        if (!ok) return;
        sayIn(main, '正在清理缓存…');
        var jobs = [];
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
          }));
        }
        if (window.caches) {
          jobs.push(caches.keys().then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          }));
        }
        Promise.all(jobs).then(function () {
          location.replace(location.pathname + '?u=' + Date.now() + (location.hash || '#/home'));
        }).catch(function () { location.reload(); });
      });
  }
  function hasNative() {
    return !!(window.NativeBridge && typeof window.NativeBridge.checkUpdate === 'function');
  }
  function checkUpdate(main) {
    if (hasNative()) {
      // APK 内是 file:// 加载，fetch('version.json') 会被 CORS 拦；交给 Java 侧下载
      sayIn(main, '正在检查…');
      UI.toast('正在检查更新…');
      try { window.NativeBridge.checkUpdate(); } catch (e) {
        sayIn(main, '检查失败（' + (e && e.message ? e.message : '未知') + '）');
      }
      return;
    }
    if (updating) { UI.toast('正在更新，请稍候'); return; }
    updating = true;
    var say = function (t) { sayIn(main, t); };
    var done = function () { updating = false; };
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var remote = j.web || '';
        var newer = cmp(remote, VER.web) > 0;
        var hasSW = !!(navigator.serviceWorker && navigator.serviceWorker.getRegistration);
        if (!hasSW) {
          if (newer) {
            say('发现 v' + remote + '，正在刷新…');
            setTimeout(function () { location.replace(location.pathname + '?u=' + Date.now() + (location.hash || '')); }, 400);
          } else { say('已是最新（v' + VER.web + '）'); UI.toast('已是最新版本'); }
          done(); return;
        }
        say(newer ? ('发现 v' + remote + '，正在下载…') : '正在核对离线缓存…');
        return navigator.serviceWorker.getRegistration().then(function (reg) {
          if (!reg) { say('离线缓存未启用，可用「强制刷新」'); done(); return; }
          return reg.update()
            .then(function () { return waitSwInstalled(reg, 40000); })
            .then(function (st) {
              if (st === 'installed' || st === 'activated') {
                say('新版本已下载，正在切换…');
                if (reg.waiting) { try { reg.waiting.postMessage('SKIP_WAITING'); } catch (e) { } }
                setTimeout(function () {
                  if (navigator.serviceWorker.controller) reloadOnce();
                  else setTimeout(reloadOnce, 600);
                }, 900);
                return;
              }
              if (st === 'none') {
                if (newer) { say('正在应用 v' + remote + '…'); setTimeout(reloadOnce, 600); }
                else { say('已是最新（v' + VER.web + '）'); UI.toast('已是最新版本'); }
                done(); return;
              }
              say('下载时间较长，可稍后自动切换；也可点「强制刷新」');
              done();
            });
        });
      })
      .catch(function (e) { say('检查失败（' + (e && e.message ? e.message : '离线或不支持') + '）'); done(); });
  }

  function exportAll() {
    var blob = new Blob([JSON.stringify({ app: 'zwk', version: VER.app, ts: Date.now(), data: Z.store }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '中医外科学备份_' + Z.nowText().replace(/[: ]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    UI.toast('已导出');
  }
  function importAll() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result), data = o.data || o;
          Object.keys(Z.store).forEach(function (k) { delete Z.store[k]; });
          Object.keys(data).forEach(function (k) { Z.store[k] = data[k]; });
          Z.save(true); UI.toast('导入成功'); setTimeout(function () { location.reload(); }, 700);
        } catch (e) { UI.dialog({ title: '导入失败', text: '文件不是本应用的备份。' }); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* ---------------- 原生壳（APK）回调：Java 侧检查/下载完更新后回调 ----------------
     Java: MainActivity 的 runUpdate() → evaluateJavascript("window.__onAutoUpdate(json)")
           checkUpdate() 手动检查 → evaluateJavascript("window.__onUpdateResult(json)")
     json: { updated:bool, msg:string, web:string, apk:string } */
  function parseJsonArg(json) {
    try { return typeof json === 'string' ? JSON.parse(json) : (json || {}); } catch (e) { return {}; }
  }
  window.__onUpdateResult = function (json) {
    var o = parseJsonArg(json);
    var msg = o.msg || (o.updated ? '更新完成' : '已是最新版本');
    var el = document.querySelector('#upd-msg');
    if (el) el.textContent = msg;
    UI.toast(msg);
    if (o.updated) setTimeout(function () {
      try { window.NativeBridge.reload(); } catch (e) { location.reload(); }
    }, 900);
  };
  window.__onAutoUpdate = function (json) {
    var o = parseJsonArg(json);
    if (!o.updated) return;
    UI.dialog({
      title: '发现新版本',
      text: '新版本资源已下载完成' + (o.web ? '（v' + o.web + '）' : '') + '，重启后生效。',
      buttons: [{ text: '稍后', value: false }, { text: '立即重启', value: true, primary: true }]
    }).then(function (ok) {
      if (ok) { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } }
    });
  };

  function renderAbout(main) {
    UI.header({ title: '关于', back: true });
    var ms = Z.MAT.stats || {}, qs = Z.QB.stats || {};
    main.innerHTML = '<div class="card"><h3 class="serif" style="margin:0 0 10px">中医外科学 · 学习工具</h3>' +
      '<p class="small" style="line-height:1.75">内容基于中国中医药出版社《中医外科学》（第六版，全国中医药行业「十五五」规划教材）。' +
      '仅供学习使用，不提供临床诊疗指导。' +
      '教材卡片：' + (ms.chapters || 0) + ' 章 ' + (ms.diseases || 0) + ' 个病证，共 ' + (ms.cards || 0) +
      ' 张卡片 / ' + (ms.pages || 0) + ' 页（每张病证卡内按【病因病机】【辨病】【治疗】【预防调护】分页，可页签或左右滑动翻页），' +
      '原书插图 ' + (ms.figs || 0) + ' 张、表格 ' + (ms.tables || 0) + ' 张（均为原书扫描裁图，可点开放大）。' +
      '练习：默写（每个证型答「证候名称 / 治法 / 方药」）与选择题（每病证三个多选小题），共 ' + (ms.syndromes || 0) + ' 个证型；' +
      '附病不进练习范围。' +
      '本机记录（笔记 / 收藏 / 编辑 / 练习草稿）只保存在设备本地，可在「我的」里导出备份。</p></div>';
  }

  function renderTip(main) {
    UI.header({ title: '赞赏支持', back: true });
    main.innerHTML = '<div class="card tip-card"><p class="tip-t serif">制作不易，如果觉得有用的话，可以给作者一点赞赏嘛，多少都是可以的，一块钱也是爱，' +
      '当然没有打赏也是可以的，支持分享，支持白嫖，大家都是医学生，不必为难</p>' +
      '<div class="qr-wrap"><img src="qr.jpg" alt="赞赏码" class="qr-img" onclick="UI.lightbox(this.getAttribute(\'src\'))"></div><p class="tiny dim center">微信 / 支付宝 扫码 · 完全自愿</p></div>';
  }

  UI.VIEWS.home = renderHome;
  UI.VIEWS.fav = renderFav;
  UI.VIEWS.search = renderSearch;
  UI.VIEWS.me = renderMe;
  UI.VIEWS.about = renderAbout;
  UI.VIEWS.tip = renderTip;
})();
