/* 中医外科学 · 病证目录（章可折叠）/ 病证卡片（翻页：页签 + 左右滑动 + 上一页/下一页）
 * 卡片形态对齐《中医内科学》：一页一个主题（病因病机 / 辨病 / 治疗 / 预防调护 …），
 * 页内不再拆小节目录；「治疗」页的多个证型在同一页里分小节展示。 */
(function () {
  'use strict';
  var Z = window.WK, UI = window.WK_UI;
  var esc = Z.esc, icon = UI.icon;

  /* =================================================================
   *  目录展开状态：默认全部折叠；展开状态存内存 + localStorage
   * ================================================================= */
  var OPEN_KEY = 'wk.cat.open.v1';
  var openChaps = (function () {
    try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}') || {}; } catch (e) { return {}; }
  })();
  function saveOpen() { try { localStorage.setItem(OPEN_KEY, JSON.stringify(openChaps)); } catch (e) { } }

  var catState = { manage: false, sel: {}, kw: '' };
  function selCount() { return Object.keys(catState.sel).length; }
  function clearSel() { catState.sel = {}; }
  function toggleSel(id) { if (catState.sel[id]) delete catState.sel[id]; else catState.sel[id] = 1; }

  function flagHTML(id) {
    var f = [];
    if (Z.isHidden(id)) f.push('<span class="flag" title="已隐藏">⊘</span>');
    if (Z.isFav(id)) f.push('<span class="flag star" title="已收藏">★</span>');
    if (Z.note(id)) f.push('<span class="flag note" title="有笔记">✎</span>');
    var e = Z.store.edits[id];
    if (e && e.pages && e.pages.some(function (x) { return !!x; })) f.push('<span class="flag" title="已修改">✐</span>');
    return '<span class="flags">' + f.join('') + '</span>';
  }

  function chipOf(c) {
    if (c.kind === 'attach') return '<span class="chip gray tiny cn-chip">附</span>';
    if (c.kind === 'chapter') return '<span class="chip solid tiny cn-chip">述</span>';
    if (c.syndromeCount) return '<span class="chip gray tiny cn-chip">' + c.syndromeCount + ' 证型</span>';
    return '';
  }

  function cardRow(c) {
    if (!c) return '';
    var hid = Z.isHidden(c.id);
    var sub = (c.kind === 'sub' || c.kind === 'attach');
    var cls = 'dr' + (sub ? ' sub' : '') + (c.kind === 'attach' ? ' attach' : '') +
      (hid ? ' hid' : '') + (catState.sel[c.id] ? ' sel' : '');
    var nm = esc(c.displayName || c.name);
    return '<div class="' + cls + '" data-dr="' + esc(c.id) + '">' +
      (catState.manage ? '<label class="ck"><input type="checkbox" data-ck="' + esc(c.id) + '"' +
        (catState.sel[c.id] ? ' checked' : '') + '></label>' : '') +
      '<span class="nm">' + nm + '</span>' +
      chipOf(c) +
      flagHTML(c.id) +
      '</div>';
  }

  function chapHeaderHTML(ch, open, n) {
    return '<div class="chap-hd" data-chap-hd="' + esc(ch.id) + '">' +
      '<span class="chap-arrow" aria-hidden="true">›</span>' +
      '<span class="cn">' + esc((ch.no || '') + ' ' + (ch.name || '')) + '</span>' +
      '<span class="chip gray tiny cn-chip">' + (n || 0) + ' 个病证</span>' +
      '</div>';
  }

  function chapHTML(ch, forceOpen) {
    var open = !!openChaps[ch.id] || !!forceOpen;
    var ids = ch.diseaseIds || [];
    var h = '<div class="chap' + (open ? ' open' : '') + '" data-chap="' + esc(ch.id) + '">' +
      chapHeaderHTML(ch, open, ids.length) + '<div class="chap-bd">';
    var cc = Z.chapterCard(ch);
    if (cc) h += '<div class="chap-first">' + cardRow(cc) + '</div>';
    ids.forEach(function (id) { var c = Z.cardById(id); if (c) h += cardRow(c); });
    h += '</div></div>';
    return h;
  }

  function matchCard(c, kw) {
    if (!kw) return true;
    var n = (c.name || '') + ' ' + (c.displayName || '');
    return n.indexOf(kw) >= 0;
  }

  function catListHTML() {
    var kw = catState.kw;
    var out = [];
    var shown = 0, chapShown = 0;
    Z.chapters.forEach(function (ch) {
      var cc = Z.chapterCard(ch);
      var hitRows = (ch.diseaseIds || []).map(function (id) { return Z.cardById(id); }).filter(function (c) {
        return c && matchCard(c, kw);
      });
      var ccHit = cc && matchCard(cc, kw);
      if (kw && !hitRows.length && !ccHit) return;
      shown += hitRows.length + (ccHit ? 1 : 0);
      chapShown++;
      if (kw) {
        /* 过滤时只列出命中的行，并强制展开 */
        var h = '<div class="chap open" data-chap="' + esc(ch.id) + '">' +
          chapHeaderHTML(ch, true, (ch.diseaseIds || []).length) + '<div class="chap-bd">';
        if (ccHit) h += '<div class="chap-first">' + cardRow(cc) + '</div>';
        hitRows.forEach(function (c) { h += cardRow(c); });
        h += '</div></div>';
        out.push(h);
      } else {
        out.push(chapHTML(ch, false));
      }
    });
    if (!out.length) {
      return '<div class="empty"><span class="em-ico">◌</span>没有找到包含「' + esc(kw) + '」的病证' +
        '<div class="tiny" style="margin-top:6px">试试更短的关键词（如「疔」「痈」「疮」），或清空搜索</div></div>';
    }
    var head = '';
    if (kw) {
      head = '<div class="tiny dim" style="margin:0 4px 8px">匹配 <b style="color:#533044">' + shown +
        '</b> 项 · ' + chapShown + ' 章 · 点病证名进卡片</div>';
    }
    if (catState.manage) {
      head += '<div class="card flat" style="padding:9px 11px"><div class="row between"><span class="small muted">勾选要隐藏（或取消隐藏）的病证</span>' +
        '<span class="chip solid tiny" id="sel-count">已选 ' + selCount() + '</span></div></div>';
    }
    return head + '<div class="card flat cat-box">' + out.join('') + '</div>' +
      '<div class="small dim center" style="margin:14px 0 4px">— 共 ' + (Z.stats.diseases || 0) +
      ' 个病证（' + (Z.chapters.length) + ' 章）· 附病 ' + attachCount() + ' 个 —</div>';
  }

  function attachCount() {
    return Z.cards.filter(function (c) { return c.kind === 'attach'; }).length;
  }

  /* ---------- 目录事件 ---------- */
  function bindCatalogList(main) {
    main.querySelectorAll('[data-chap-hd]').forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-chap-hd');
        if (openChaps[id]) delete openChaps[id]; else openChaps[id] = 1;
        saveOpen();
        repaintList(main);
      };
    });
    main.querySelectorAll('[data-dr]').forEach(function (el) {
      el.onclick = function (e) {
        var id = el.getAttribute('data-dr');
        if (catState.manage) {
          if (e.target.closest && e.target.closest('.ck')) return;
          toggleSel(id);
          el.classList.toggle('sel', !!catState.sel[id]);
          var ck = el.querySelector('input'); if (ck) ck.checked = !!catState.sel[id];
          paintManageBar(main);
          return;
        }
        UI.go('#/card/' + id);
      };
    });
    main.querySelectorAll('[data-ck]').forEach(function (ck) {
      ck.onclick = function (e) {
        e.stopPropagation();
        var id = ck.getAttribute('data-ck');
        toggleSel(id);
        var row = ck.closest('.dr'); if (row) row.classList.toggle('sel', !!catState.sel[id]);
        paintManageBar(main);
      };
    });
  }
  function repaintList(main) {
    var box = main.querySelector('#cat-list');
    if (!box) { renderCatalog(main); return; }
    box.innerHTML = catListHTML();
    bindCatalogList(main);
    var sc = main.querySelector('#sel-count');
    if (sc) sc.textContent = '已选 ' + selCount();
    if (catState.manage) paintManageBar(main);
  }

  function removeManageBar() { var b = document.getElementById('fbar'); if (b) b.remove(); }
  function paintManageBar(main) {
    if (!catState.manage) { removeManageBar(); return; }
    var bar = document.getElementById('fbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fbar';
      document.getElementById('app').appendChild(bar);
    }
    var n = selCount();
    var hiddenN = Z.hiddenCount();
    bar.innerHTML =
      '<button class="btn sm" data-mb="all">全选</button>' +
      '<button class="btn sm" data-mb="none">清空</button>' +
      '<span class="grow"></span>' +
      '<button class="btn sm danger" data-mb="hide"' + (n ? '' : ' disabled') + '>隐藏' + (n ? '(' + n + ')' : '') + '</button>' +
      (hiddenN ? '<button class="btn sm" data-mb="unhide">取消隐藏</button>' : '');
    bar.querySelector('[data-mb="all"]').onclick = function () {
      Z.cards.forEach(function (c) { catState.sel[c.id] = 1; });
      repaintList(main); paintManageBar(main);
    };
    bar.querySelector('[data-mb="none"]').onclick = function () {
      clearSel(); repaintList(main); paintManageBar(main);
    };
    bar.querySelector('[data-mb="hide"]').onclick = function () {
      var ids = Object.keys(catState.sel);
      if (!ids.length) return;
      ids.forEach(function (id) { Z.setHidden(id, true); });
      UI.toast('已隐藏 ' + ids.length + ' 个病证');
      clearSel(); repaintList(main);
    };
    var uh = bar.querySelector('[data-mb="unhide"]');
    if (uh) uh.onclick = function () {
      var ids = Object.keys(catState.sel).filter(function (id) { return Z.isHidden(id); });
      if (!ids.length) { UI.toast('勾选里没有已隐藏的病证'); return; }
      ids.forEach(function (id) { Z.setHidden(id, false); });
      UI.toast('已取消隐藏 ' + ids.length + ' 个病证');
      clearSel(); repaintList(main);
    };
  }

  function renderCatalog(main) {
    var mg = catState.manage;
    UI.header({
      title: '病证目录',
      sub: (Z.stats.diseases || 0) + ' 个病证',
      actions: [
        { icon: 'search', label: '搜索全书', onClick: function () { UI.go('#/search'); } },
        {
          text: mg ? '完成' : '管理', label: '批量管理', onClick: function () {
            catState.manage = !mg; clearSel(); renderCatalog(main);
          }
        }
      ]
    });
    var h = [];
    var hc = Z.hiddenCount();
    if (hc && !mg) {
      h.push('<div class="card" style="padding:10px 12px"><div class="row between"><div class="small muted">已隐藏 ' +
        hc + ' 个病证（目录中带删除线，卡片切换时跳过）</div>' +
        '<button class="btn xs" id="show-hidden">去取消隐藏</button></div></div>');
    }
    h.push('<div class="searchbox mb10" style="margin-bottom:10px"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="cat-kw" placeholder="在本目录中查找病证名（如 疖、丹毒）" value="' + esc(catState.kw) + '" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>');
    h.push('<div id="cat-list">' + catListHTML() + '</div>');
    main.innerHTML = h.join('');
    main.className = mg ? 'has-bar' : '';
    bindCatalogList(main);

    /* 搜索框：不重建节点，中文输入法合成期间不刷新，只替换 #cat-list */
    var kwEl = main.querySelector('#cat-kw');
    if (kwEl) {
      var composing = false, timer = null;
      function applyFilter() {
        catState.kw = kwEl.value.trim();
        repaintList(main);
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(applyFilter, 180); }
      kwEl.addEventListener('compositionstart', function () { composing = true; });
      kwEl.addEventListener('compositionend', function () { composing = false; schedule(); });
      kwEl.oninput = function () { if (composing) return; schedule(); };
      kwEl.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); applyFilter(); kwEl.blur(); }
        else if (e.key === 'Escape') { kwEl.value = ''; catState.kw = ''; clearTimeout(timer); applyFilter(); }
      };
    }
    var sh = main.querySelector('#show-hidden');
    if (sh) sh.onclick = function () {
      catState.manage = true; catState.sel = {};
      renderCatalog(main);
      UI.toast('已进入管理，勾选被隐藏的病证再点「取消隐藏」');
    };
    if (mg) paintManageBar(main); else removeManageBar();
  }

  /* =================================================================
   *  卡片（数据驱动：pages[] 一页一个主题）
   * ================================================================= */
  var cardState = { panel: null, panelId: '', page: 0 };

  function pageOfCard(c, q) {
    var n = (c.pages || []).length;
    var page = 0;
    if (q && q.p != null && q.p !== '') page = parseInt(q.p, 10) || 0;
    else if (cardState.panelId === c.id) page = cardState.page | 0;
    if (page < 0) page = 0;
    if (page > n - 1) page = Math.max(0, n - 1);
    return page;
  }

  function tabsHTML(c, page) {
    var t = (c.pages || []).map(function (pg, i) {
      return '<button class="pg-tab' + (i === page ? ' on' : '') + '" data-pg="' + i + '">' +
        '<span class="pg-i">' + (i + 1) + '</span><span class="pg-t">' + esc(pg.title || ('第 ' + (i + 1) + ' 页')) +
        '</span></button>';
    }).join('');
    return '<div class="pg-tabs" id="pg-tabs">' + t + '</div>';
  }

  function pagerHTML(page, n) {
    return '<div class="pager">' +
      '<button class="btn sm" id="pg-prev"' + (page <= 0 ? ' disabled' : '') + '>‹ 上一页</button>' +
      '<span class="pg-now">第 ' + (page + 1) + '/' + n + ' 页</span>' +
      '<button class="btn sm" id="pg-next"' + (page >= n - 1 ? ' disabled' : '') + '>下一页 ›</button>' +
      '</div>';
  }

  function actsHTML(c) {
    return '<div class="ct-acts">' +
      '<button class="btn sm' + (Z.note(c.id) ? ' on' : '') + '" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(c.id) ? ' on' : '') + '" data-act="fav">' + icon('star') + (Z.isFav(c.id) ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm' + (c.hasEdit ? ' on' : '') + '" data-act="edit">' + icon('edit') + '编辑</button>' +
      '<button class="btn sm" data-act="hide">' + icon('hide') + '隐藏</button>' +
      '</div>';
  }

  function panelHTML(c, kind) {
    if (kind === 'note') {
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>笔记 · ' + esc(c.displayName || c.name) + '</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<textarea class="textarea" id="note-txt" placeholder="写点自己的理解、口诀或易错点…">' + esc(Z.note(c.id)) + '</textarea>' +
        '<div class="p-ft"><button class="btn sm" data-pc="note-del">清除</button>' +
        '<button class="btn sm primary" data-pc="note-save">保存笔记</button></div></div>';
    }
    if (kind === 'edit') {
      var h = ['<div class="panel" id="card-panel"><div class="p-hd"><span>编辑内容 · ' +
        esc(c.displayName || c.name) + '</span><button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="tiny dim" style="margin:0 0 8px">按页编辑：一段一行、段落之间空一行。' +
        '保存只替换正文段落，图/表/证型/小节的顺序与位置不变；仅本机生效，可随时「恢复原文」。</p>'];
      (c.pages || []).forEach(function (pg, i) {
        var txt = Z.pagePText(pg);
        var hasP = (pg.blocks || []).some(function (b) { return b && b.t === 'p'; });
        h.push('<div class="ef"><label>第 ' + (i + 1) + ' 页 · ' + esc(pg.title || '') + '</label>' +
          (hasP
            ? '<textarea class="textarea ep-txt" data-ep="' + i + '" rows="6">' + esc(txt) + '</textarea>'
            : '<div class="tiny dim">本页没有正文段落（只有图 / 表 / 证型），不用编辑。</div>') +
          '</div>');
      });
      h.push('<div class="p-ft"><button class="btn sm" data-pc="edit-reset">恢复原文</button>' +
        '<button class="btn sm primary" data-pc="edit-save">保存修改</button></div></div>');
      return h.join('');
    }
    if (kind === 'hide') {
      var hid = Z.isHidden(c.id);
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>' + (hid ? '取消隐藏' : '隐藏病证') + '</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="small muted">' + (hid
          ? '取消隐藏后，该病证会重新出现在目录并恢复卡片切换。'
          : '隐藏后，目录中显示删除线、卡片「上一病证 / 下一病证」会跳过它，可在目录「管理」里批量取消。') + '</p>' +
        '<div class="p-ft"><button class="btn sm primary" data-pc="hide-do">' + (hid ? '取消隐藏' : '确认隐藏') + '</button></div></div>';
    }
    return '';
  }

  function renderCard(main, p, q) {
    var id = (p && p[0]) || '';
    var c = Z.viewCard(id);
    if (!c) {
      UI.header({ title: '病证不存在', back: true, backTo: '#/catalog' });
      main.innerHTML = UI.emptyBox('病证不存在', '回目录重新选择');
      return;
    }
    var n = (c.pages || []).length;
    var page = pageOfCard(c, q);
    cardState.page = page;
    cardState.panelId = c.id;
    var hid = Z.isHidden(c.id);
    Z.store.last.card = c.id; Z.save();

    UI.header({ title: c.displayName || c.name, sub: c.chapterNo || '', back: true, backTo: '#/catalog' });

    var h = [];
    if (hid) {
      h.push('<div class="notice warn mb10"><span>该病证已隐藏（目录带删除线、卡片切换跳过）。</span>' +
        '<button class="btn xs" id="unhide-now">取消隐藏</button></div>');
    }
    if (c.hasEdit) {
      h.push('<div class="notice mb10"><span>内容已按你的编辑显示。</span>' +
        '<button class="btn xs" id="reset-now">恢复原文</button></div>');
    }
    h.push('<div class="card card-main">');
    h.push('<div class="ct-hd"><div class="ct-name">' + esc(c.displayName || c.name) + '</div>' +
      '<div class="ct-sub">' + esc(c.chapterName || '') + ' · ' + (c.syndromeCount || 0) + ' 个证型 · ' + n + ' 页</div></div>');
    h.push(tabsHTML(c, page));
    var body = Z.renderRich((c.pages[page] || {}).blocks);
    h.push('<div class="ct-body rich" id="ct-body">' + (body || '<div class="empty">本页暂无内容</div>') + '</div>');
    h.push(pagerHTML(page, n));
    h.push(actsHTML(c));
    if (cardState.panel && cardState.panelId === c.id) h.push(panelHTML(c, cardState.panel));
    else h.push('<div id="card-panel"></div>');
    h.push('</div>');
    var prev = Z.navCard(c.id, -1), next = Z.navCard(c.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="d-prev"' + (prev ? '' : ' disabled') + '>‹ 上一病证</button>' +
      '<button class="btn sm" id="d-next"' + (next ? '' : ' disabled') + '>下一病证 ›</button></div>');
    main.innerHTML = h.join('');
    /* 当前页签滚入可视区（页签多于 4 个时可横向滑动） */
    var tabs = main.querySelector('#pg-tabs');
    if (tabs) {
      var on = tabs.querySelector('.pg-tab.on');
      if (on && (on.offsetLeft < tabs.scrollLeft || on.offsetLeft + on.offsetWidth > tabs.scrollLeft + tabs.clientWidth)) {
        tabs.scrollLeft = Math.max(0, on.offsetLeft - 8);
      }
    }
    bindCard(main, c, page);
  }

  function bindCard(main, c, page) {
    var n = (c.pages || []).length;
    function gotoPage(i, replace) {
      i = Math.min(Math.max(0, i), n - 1);
      var href = '#/card/' + c.id + '?p=' + i;
      if (replace) UI.replaceHash(href); else UI.go(href);
    }
    main.querySelectorAll('[data-pg]').forEach(function (b) {
      b.onclick = function () { gotoPage(+b.getAttribute('data-pg'), true); };
    });
    var pv = main.querySelector('#pg-prev'); if (pv) pv.onclick = function () { gotoPage(page - 1, true); };
    var nx = main.querySelector('#pg-next'); if (nx) nx.onclick = function () { gotoPage(page + 1, true); };

    /* 左右滑动翻页：横向位移 > 60px 且纵向 < 40px */
    var body = main.querySelector('#ct-body');
    if (body) {
      var st = null;
      body.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { st = null; return; }
        var t = e.touches[0];
        st = { x: t.clientX, y: t.clientY };
      }, { passive: true });
      body.addEventListener('touchend', function (e) {
        if (!st) return;
        var t = (e.changedTouches && e.changedTouches[0]) || null;
        if (!t) { st = null; return; }
        var dx = t.clientX - st.x, dy = t.clientY - st.y;
        st = null;
        if (Math.abs(dx) <= 60 || Math.abs(dy) >= 40) return;
        if (dx < 0) gotoPage(page + 1, true); else gotoPage(page - 1, true);
      });
    }

    var dp = main.querySelector('#d-prev');
    if (dp) dp.onclick = function () { var id = Z.navCard(c.id, -1); if (id) UI.go('#/card/' + id + '?p=0'); };
    var dn = main.querySelector('#d-next');
    if (dn) dn.onclick = function () { var id = Z.navCard(c.id, 1); if (id) UI.go('#/card/' + id + '?p=0'); };
    var uh = main.querySelector('#unhide-now');
    if (uh) uh.onclick = function () { Z.setHidden(c.id, false); UI.toast('已取消隐藏'); renderCard(main, [c.id], { p: page }); };
    var rs = main.querySelector('#reset-now');
    if (rs) rs.onclick = function () {
      UI.confirmDialog('恢复原文', '将清除该病证的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (ok) { Z.clearEdits(c.id); UI.toast('已恢复原文'); renderCard(main, [c.id], { p: page }); }
      });
    };
    main.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        if (a === 'fav') {
          Z.toggleFav(c.id);
          UI.toast(Z.isFav(c.id) ? '已收藏' : '已取消收藏');
          renderCard(main, [c.id], { p: page });
          return;
        }
        cardState.panel = (cardState.panel === a) ? null : a;
        cardState.panelId = c.id;
        renderCard(main, [c.id], { p: page });
      };
    });
    bindPanel(main, c, page);
  }

  function bindPanel(main, c, page) {
    var panel = main.querySelector('#card-panel');
    if (!panel) return;
    function close() { cardState.panel = null; renderCard(main, [c.id], { p: page }); }
    panel.querySelectorAll('[data-pc="close"]').forEach(function (b) { b.onclick = close; });
    var sv = panel.querySelector('[data-pc="note-save"]');
    if (sv) sv.onclick = function () {
      Z.setNote(c.id, panel.querySelector('#note-txt').value);
      UI.toast('笔记已保存'); close();
    };
    var dl = panel.querySelector('[data-pc="note-del"]');
    if (dl) dl.onclick = function () { Z.setNote(c.id, ''); UI.toast('已清除笔记'); close(); };
    var hd = panel.querySelector('[data-pc="hide-do"]');
    if (hd) hd.onclick = function () {
      var cur = Z.isHidden(c.id);
      Z.setHidden(c.id, !cur);
      UI.toast(cur ? '已取消隐藏' : '已隐藏该病证');
      close();
    };
    var er = panel.querySelector('[data-pc="edit-reset"]');
    if (er) er.onclick = function () {
      UI.confirmDialog('恢复原文', '将清除该病证的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (!ok) return;
        Z.clearEdits(c.id); UI.toast('已恢复原文'); close();
      });
    };
    var es = panel.querySelector('[data-pc="edit-save"]');
    if (es) es.onclick = function () {
      var changed = 0;
      panel.querySelectorAll('textarea[data-ep]').forEach(function (ta) {
        var i = +ta.getAttribute('data-ep');
        if (Z.savePageEdit(c.id, i, ta.value)) changed++;
      });
      Z.save(true);
      UI.toast(changed ? '已保存 ' + changed + ' 页修改' : '没有改动');
      close();
    };
  }

  /* ---------------- 键盘 ←/→ 翻页 ---------------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.isComposing) return;
    if (window.WK_UI && WK_UI.dialogOpen && WK_UI.dialogOpen()) return;
    var t = e.target || {};
    var tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || t.isContentEditable) return;
    if ((location.hash || '').indexOf('#/card/') !== 0) return;
    var route = UI.parseHash();
    if (route.name !== 'card' || !route.p[0]) return;
    var c = Z.viewCard(route.p[0]);
    if (!c) return;
    var n = (c.pages || []).length;
    var cur = parseInt(route.q.p, 10); if (isNaN(cur)) cur = 0;
    var np = Math.min(Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)), n - 1);
    if (np === cur) return;
    e.preventDefault();
    UI.replaceHash('#/card/' + c.id + '?p=' + np);
  });

  /* 离开目录/卡片页时收掉管理条与卡片内面板，避免跨页残留 */
  window.addEventListener('hashchange', function () {
    var r = UI.parseHash();
    if (r.name !== 'catalog' && r.name !== 'mat') {
      catState.manage = false; clearSel(); removeManageBar();
    }
    if (r.name !== 'card') cardState.panel = null;
  });

  UI.VIEWS.catalog = renderCatalog;
  UI.VIEWS.mat = renderCatalog;         /* 底栏「教材」直接进目录 */
  UI.VIEWS.card = renderCard;
  window.WK_CARDS = {
    removeManageBar: removeManageBar,
    resetOpen: function () { openChaps = {}; saveOpen(); },
    setOpen: function (id, v) { if (v) openChaps[id] = 1; else delete openChaps[id]; saveOpen(); }
  };
})();
