/* 中医外科学 · 数据层 / 本地存储 / 块渲染 / 搜索
 * 数据模型（2026-11-25 新版）：
 *   window.WK_MAT = { chapters[], cards[], stats{} }
 *     chapters[i] = { id,no,num,name, cardId, diseaseIds[] }
 *     cards[i]    = { id, kind:'chapter'|'main'|'sub'|'attach', chapterId, chapterNo,
 *                     chapterName, name, displayName, parentId, printedPage, pdfPage,
 *                     syndromeCount, pages:[{title, blocks[]}] }
 *     blocks: p / h / img / table / syn / sub（sub 可递归）
 *   卡片 = 教材的一个病证（或章概述）；「页」= 病证内的【病因病机】【辨病】【治疗】…
 */
(function () {
  'use strict';
  var MAT = window.WK_MAT || {};
  var QB = window.WK_QB || {};
  var CHAPS = MAT.chapters || [];
  var CARDS = MAT.cards || [];

  var cardBy = Object.create(null);
  var chapBy = Object.create(null);
  var order = [];                       /* 全书卡片顺序：章概述在前，再按 diseaseIds */
  var orderIndex = Object.create(null);
  CARDS.forEach(function (c) { if (c && c.id) cardBy[c.id] = c; });
  CHAPS.forEach(function (c) { if (c && c.id) chapBy[c.id] = c; });
  CHAPS.forEach(function (ch) {
    if (ch.cardId && cardBy[ch.cardId] && order.indexOf(ch.cardId) < 0) order.push(ch.cardId);
    (ch.diseaseIds || []).forEach(function (id) {
      if (cardBy[id] && order.indexOf(id) < 0) order.push(id);
    });
  });
  CARDS.forEach(function (c) { if (c && order.indexOf(c.id) < 0) order.push(c.id); });
  order.forEach(function (id, i) { orderIndex[id] = i; });

  /* ---------------- 本地存储（键名与结构保持不变） ----------------
   * notes[cardId]=文本 / fav[cardId]=1 / hidden[cardId]=1
   * edits[cardId]={pages:[ {title,blocks} | null, … ]}  —— 只把改过的页写成对象，未改的页留 null
   * drafts/prec/sel 供练习模块使用；last.card / meta 记录状态。 */
  var KEY = 'wk.data.v1';
  var DEFAULT = {
    notes: {}, fav: {}, hidden: {}, edits: {},
    drafts: [], prec: [], sel: {},
    last: { card: '' },
    meta: { ver: '', annOpen: true }
  };
  var store = load();
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var o = JSON.parse(raw);
      Object.keys(DEFAULT).forEach(function (k) { if (o[k] == null) o[k] = clone(DEFAULT[k]); });
      if (!o.last || typeof o.last !== 'object') o.last = { card: '' };
      if (!Array.isArray(o.drafts)) o.drafts = [];
      if (!Array.isArray(o.prec)) o.prec = [];
      return o;
    } catch (e) { return clone(DEFAULT); }
  }
  var timer = null;
  function save(now) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (now) { persist(); return; }
    timer = setTimeout(persist, 150);
  }
  function persist() {
    timer = null;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function shuffle(a) {
    a = (a || []).slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function uniq(a) {
    var out = [], seen = {};
    (a || []).forEach(function (x) {
      var k = String(x == null ? '' : x).trim();
      if (!k || seen[k]) return;
      seen[k] = 1; out.push(k);
    });
    return out;
  }
  function nowText(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ''); }

  /* ---------------- 块 → HTML（6 种块，sub 递归） ---------------- */
  function cellHTML(s) {
    var x = inline(String(s == null ? '' : s));
    x = x.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    x = x.replace(/&lt;\/?(sub|sup)&gt;/gi, '');
    x = x.replace(/<\s*br\s*\/?>/gi, '<br>');
    x = x.replace(/\n/g, '<br>');
    return x;
  }
  var P_LABEL = /^(临床表现|证候分析|辨证分析|治法|代表方|方药|诊断|鉴别诊断|预防调护|预防与调护)：/;

  function tableHTML(bl) {
    /* 新版数据：表格 = 原书扫描裁图 {t:'table', img, cap}，点开可放大；无图时退回文字表 */
    if (bl && bl.img) {
      return '<figure class="tbl-fig"><img src="' + esc(bl.img) + '" alt="' + esc(bl.cap || '表格') +
        '" loading="lazy"><figcaption>' + esc(bl.cap || '') + '</figcaption></figure>';
    }
    var h = ['<div class="tbl-wrap"><table><thead><tr>'];
    (bl.head || []).forEach(function (c) { h.push('<th>' + cellHTML(c) + '</th>'); });
    h.push('</tr></thead><tbody>');
    (bl.rows || []).forEach(function (r) {
      h.push('<tr>');
      r.forEach(function (c, ci) { h.push('<td' + (ci === 0 ? ' class="fc"' : '') + '>' + cellHTML(c) + '</td>'); });
      h.push('</tr>');
    });
    h.push('</tbody></table></div>');
    return h.join('');
  }

  function imgHTML(bl) {
    return '<figure class="rich-img"><img src="' + esc(bl.src || '') + '" alt="' + esc(bl.alt || '') +
      '" loading="lazy"><figcaption>' + esc(bl.alt || '') + '</figcaption></figure>';
  }

  /* 证型：序号 = 该页内第几个证型（ctx.syn 累计） */
  function synHTML(bl, ctx) {
    ctx.syn = (ctx.syn || 0) + 1;
    var parts = [];
    if (bl.clinic) parts.push('<p><b class="fl">临床表现：</b>' + inline(bl.clinic) + '</p>');
    else parts.push('<p class="dim syn-none">（原书未单列）</p>');
    if (bl.treat) parts.push('<p><b class="fl">治法：</b>' + inline(bl.treat) + '</p>');
    if (bl.formula) parts.push('<p><b class="fl">代表方：</b>' + inline(bl.formula) + '</p>');
    return '<div class="syn" data-sid="' + esc(bl.sid || '') + '">' +
      '<div class="syn-h"><span class="syn-n">' + ctx.syn + '</span>' +
      '<span class="syn-t">' + inline(bl.name) + '</span></div>' +
      '<div class="syn-b">' + parts.join('') + '</div></div>';
  }

  function subHTML(bl, ctx) {
    return '<section class="sec sub"><h3 class="sec-h">' + inline(bl.title) + '</h3>' +
      '<div class="sec-b">' + blocksHTML(bl.blocks, ctx) + '</div></section>';
  }

  function blockHTML(bl, ctx) {
    if (!bl || !bl.t) return '';
    switch (bl.t) {
      case 'p': {
        var x = inline(bl.x).replace(/\n/g, '<br>');
        if (P_LABEL.test(String(bl.x || ''))) x = x.replace(P_LABEL, '<b class="fl">$1：</b>');
        return '<p>' + x + '</p>';
      }
      case 'h': return '<div class="rich-h lv' + (parseInt(bl.lv, 10) || 3) + '">' + inline(bl.x) + '</div>';
      case 'img': return imgHTML(bl);
      case 'table': return tableHTML(bl);
      case 'syn': return synHTML(bl, ctx);
      case 'sub': return subHTML(bl, ctx);
      default: return '';
    }
  }
  function blocksHTML(blocks, ctx) {
    if (!blocks || !blocks.length) return '';
    ctx = ctx || {};
    var out = [];
    for (var i = 0; i < blocks.length; i++) out.push(blockHTML(blocks[i], ctx));
    return out.join('');
  }
  function renderRich(input) {
    return blocksHTML(Array.isArray(input) ? input : [], { syn: 0 });
  }
  function blocksText(input) {
    var out = [];
    function walk(bs) {
      (bs || []).forEach(function (b) {
        if (!b || !b.t) return;
        if (b.t === 'p' || b.t === 'h') out.push(b.x || '');
        else if (b.t === 'img') out.push(b.alt || '');
        else if (b.t === 'table') out.push(b.cap || '');
        else if (b.t === 'syn') out.push([b.name, b.clinic, b.treat, b.formula].filter(Boolean).join(' '));
        else if (b.t === 'sub') { if (b.title) out.push(b.title); walk(b.blocks); }
      });
    }
    walk(Array.isArray(input) ? input : []);
    return out.join('\n');
  }
  /* 该页内所有正文（搜索/预览用） */
  function pageText(page) { return page ? blocksText(page.blocks) : ''; }

  /* ---------------- 卡片 / 章 ---------------- */
  function cardById(id) { return cardBy[id] || null; }
  function chapterById(id) { return chapBy[id] || null; }
  function cardsOfChapter(chId) {
    var ch = chapBy[chId];
    if (!ch) return [];
    return (ch.diseaseIds || []).map(function (id) { return cardBy[id]; }).filter(Boolean);
  }
  function chapterCard(ch) { return ch && ch.cardId ? cardBy[ch.cardId] || null : null; }
  function isChapterCard(c) { return !!c && c.kind === 'chapter'; }
  function cardPageCount(c) { return (c && c.pages || []).length; }
  function cardKindLabel(c) {
    if (!c) return '';
    if (c.kind === 'chapter') return '本章概述';
    if (c.kind === 'attach') return '附病';
    if (c.kind === 'sub') return '子病证';
    return '病证';
  }

  /* 章内上一个 / 下一个（只在本章 diseaseIds 顺序里走，跳过隐藏；章概述卡排第一） */
  function chapterSequence(chId) {
    var ch = chapBy[chId];
    if (!ch) return [];
    var list = [];
    if (ch.cardId && cardBy[ch.cardId]) list.push(ch.cardId);
    (ch.diseaseIds || []).forEach(function (id) {
      if (cardBy[id] && list.indexOf(id) < 0) list.push(id);
    });
    return list;
  }
  function navCard(cardId, dir) {
    var c = cardBy[cardId];
    if (!c) return '';
    var list = chapterSequence(c.chapterId);
    var i = list.indexOf(cardId);
    if (i < 0) return '';
    var n = list.length;
    for (var step = 1; step <= n; step++) {
      var j = i + dir * step;
      if (j < 0 || j >= n) return '';
      var cand = list[j];
      if (!store.hidden[cand]) return cand;
    }
    return '';
  }

  /* 本机编辑覆盖：edits[cardId] = {pages:[...]}（未改的页为 null） */
  function hasEditPages(e) {
    var p = (e && e.pages) || [];
    for (var i = 0; i < p.length; i++) if (p[i]) return true;
    return false;
  }
  function viewCard(id) {
    var c = cardBy[id];
    if (!c) return null;
    var e = store.edits[id] || {};
    var ep = Array.isArray(e.pages) ? e.pages : [];
    var orig = c.pages || [];
    var pages = orig.map(function (p, i) {
      var x = ep[i];
      if (!x) return p;
      return {
        title: (x.title != null && x.title !== '') ? x.title : p.title,
        blocks: (x.blocks && x.blocks.length) ? x.blocks : p.blocks
      };
    });
    return {
      id: c.id, kind: c.kind, name: c.name, displayName: c.displayName || c.name,
      chapterId: c.chapterId, chapterNo: c.chapterNo, chapterName: c.chapterName,
      parentId: c.parentId || '', printedPage: c.printedPage, pdfPage: c.pdfPage,
      syndromeCount: c.syndromeCount || 0,
      pages: pages,
      editedPages: ep.map(function (x) { return !!x; }),
      hasEdit: hasEditPages(e)
    };
  }
  function clearEdits(id) { delete store.edits[id]; save(true); }

  /* ---------------- 编辑：页内段落文本 ↔ p 块 ----------------
   * 只替换该页顶层的 p 块序列，img/table/syn/sub 块保持原位不动。 */
  function pagePText(page) {
    var out = [];
    ((page && page.blocks) || []).forEach(function (b) { if (b && b.t === 'p') out.push(String(b.x || '')); });
    return out.join('\n\n');
  }
  function splitParas(txt) {
    return String(txt == null ? '' : txt).split(/\n[ \t]*\n/).map(function (s) {
      return s.replace(/\s+$/, '').replace(/^\s+/, '');
    }).filter(function (s) { return s.length > 0; });
  }
  function replacePageP(page, txt) {
    var blocks = (page && page.blocks || []).slice();
    var paras = splitParas(txt);
    var pIdx = [];
    blocks.forEach(function (b, i) { if (b && b.t === 'p') pIdx.push(i); });
    if (!pIdx.length) return blocks;                     /* 整页没有 p 块：编辑无效（面板里也不显示输入框） */
    if (!paras.length) {                                  /* 全删光：只留非 p 块 */
      return blocks.filter(function (b) { return !b || b.t !== 'p'; });
    }
    if (paras.length >= pIdx.length) {
      /* 段数够：前 n-1 段一一对应，多出来的并进最后一段 */
      var tail = paras.slice(pIdx.length - 1).join('\n');
      var k = 0;
      pIdx.forEach(function (bi, n) {
        blocks[bi] = { t: 'p', x: (n === pIdx.length - 1) ? tail : paras[n] };
        k++;
      });
    } else {
      /* 段数变少：前段一一对应，末尾多余的原 p 块删掉 */
      var del = {};
      pIdx.forEach(function (bi, n) {
        if (n < paras.length) blocks[bi] = { t: 'p', x: paras[n] };
        else del[bi] = 1;
      });
      blocks = blocks.filter(function (b, i) { return !del[i]; });
    }
    return blocks;
  }
  function savePageEdit(cardId, pageIdx, txt) {
    var c = cardBy[cardId];
    if (!c) return false;
    var orig = (c.pages || [])[pageIdx];
    if (!orig) return false;
    var e = store.edits[cardId] || {};
    var pages = Array.isArray(e.pages) ? e.pages.slice() : [];
    while (pages.length < (c.pages || []).length) pages.push(null);
    var before = pagePText(orig);
    var after = String(txt == null ? '' : txt);
    if (before.replace(/\s+/g, ' ').trim() === after.replace(/\s+/g, ' ').trim()) {
      pages[pageIdx] = null;               /* 没改动 → 不占编辑位 */
    } else {
      pages[pageIdx] = { title: orig.title, blocks: replacePageP(orig, after) };
    }
    var any = pages.some(function (x) { return !!x; });
    if (any) store.edits[cardId] = { pages: pages };
    else delete store.edits[cardId];
    save(true);
    return any;
  }

  /* ---------------- 笔记 / 收藏 / 隐藏（卡片级） ---------------- */
  function note(id) { return store.notes[id] || ''; }
  function setNote(id, t) { if (t && t.trim()) store.notes[id] = t; else delete store.notes[id]; save(true); }
  function isFav(id) { return !!store.fav[id]; }
  function toggleFav(id) { if (store.fav[id]) delete store.fav[id]; else store.fav[id] = 1; save(true); }
  function isHidden(id) { return !!store.hidden[id]; }
  function setHidden(id, v) { if (v) store.hidden[id] = 1; else delete store.hidden[id]; save(true); }
  function hiddenCount() { return Object.keys(store.hidden).filter(function (id) { return !!cardBy[id]; }).length; }
  function favCards() {
    return Object.keys(store.fav).filter(function (id) { return !!cardBy[id]; })
      .sort(function (a, b) { return (orderIndex[a] || 0) - (orderIndex[b] || 0); })
      .map(function (id) { return cardBy[id]; });
  }

  /* ---------------- 练习数据（WK_QB）辅助 ---------------- */
  function qbChapters() {
    var have = {}, out = [];
    (QB.diseases || []).forEach(function (d) { have[d.chapterId] = 1; });
    (QB.chapters || []).forEach(function (c) { if (have[c.id]) out.push(c); });
    return out;
  }
  function qbChapterOf(id) { return chapBy[id] || (QB.chapters || []).filter(function (c) { return c.id === id; })[0] || null; }
  function qbOf(chapterId) {
    return (QB.diseases || []).filter(function (d) { return !chapterId || d.chapterId === chapterId; });
  }
  function qbById(id) {
    var list = QB.diseases || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function syOf(d) { return (d && d.syndromes) || []; }
  function isExam(d) {
    return !!d && d.kind !== 'attach' && d.practicePool !== false &&
      syOf(d).filter(function (s) { return s && s.name; }).length > 0;
  }
  function examDiseases() { return (QB.diseases || []).filter(isExam); }
  function dname(d) { return (d && (d.displayName || d.name)) || ''; }
  function diseaseLabel(d) {
    if (!d) return '';
    if (d.kind === 'attach') return dname(d) + '（附病·不考）';
    return dname(d);
  }
  function chapLabel(chapterId) {
    var c = chapBy[chapterId];
    if (!c) c = (QB.chapters || []).filter(function (x) { return x.id === chapterId; })[0];
    return c ? ((c.no ? c.no + ' ' : '') + (c.name || '')) : '';
  }
  /* 证型 → 原卡片跳转地址 */
  function syndromeHref(sy) {
    if (!sy || !sy.cardId || !cardBy[sy.cardId]) return '';
    var c = cardBy[sy.cardId];
    var p = parseInt(sy.page, 10);
    if (isNaN(p) || p < 0 || p >= (c.pages || []).length) p = 0;
    return '#/card/' + sy.cardId + '?p=' + p;
  }

  /* ---------------- 搜索 ----------------
   * 分组：cards（卡片名 1000/900/800） / syns（证型名 900） / formulas（方剂名 850）
   *       / pages（页内正文 100+次数×12） / subs（页内小标题 620） */
  function countOf(hay, needle) {
    if (!needle) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
    return n;
  }
  function snippetOf(txt, raw, span) {
    span = span || 26;
    txt = String(txt || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    var i = raw ? txt.toLowerCase().indexOf(String(raw).toLowerCase()) : -1;
    if (i < 0) return { pre: '', mid: '', post: txt.slice(0, span * 2) + (txt.length > span * 2 ? '…' : '') };
    var a = Math.max(0, i - span), b = Math.min(txt.length, i + String(raw).length + span);
    return {
      pre: (a > 0 ? '…' : '') + txt.slice(a, i),
      mid: txt.slice(i, i + String(raw).length),
      post: txt.slice(i + String(raw).length, b) + (b < txt.length ? '…' : '')
    };
  }
  /* 方剂名 → 第一次出现的位置（构建一次，搜索时直接用） */
  var formulaIndex = null;
  function buildFormulaIndex() {
    var idx = Object.create(null);
    CARDS.forEach(function (c) {
      (c.pages || []).forEach(function (pg, pi) {
        (function walk(bs) {
          (bs || []).forEach(function (b) {
            if (!b) return;
            if (b.t === 'sub') { walk(b.blocks); return; }
            if (b.t !== 'syn') return;
            (b.formulaNames || []).forEach(function (f) {
              var k = norm(f);
              if (!k || idx[k]) return;
              idx[k] = { name: f, cardId: c.id, pageIdx: pi, synName: b.name || '', pageTitle: pg.title || '' };
            });
          });
        })(pg.blocks);
      });
    });
    return idx;
  }
  function formulaHit(q) {
    if (!formulaIndex) formulaIndex = buildFormulaIndex();
    var out = [], seen = {};
    Object.keys(formulaIndex).forEach(function (k) {
      var it = formulaIndex[k];
      var s = 0;
      if (k === q) s = 850; else if (k.indexOf(q) === 0) s = 820; else if (k.indexOf(q) >= 0) s = 780;
      if (!s) return;
      if (seen[it.name]) return;
      seen[it.name] = 1;
      out.push({
        type: 'formula', name: it.name, cardId: it.cardId, pageIdx: it.pageIdx, pageTitle: it.pageTitle,
        sub: '方剂 · ' + chapLabel(cardById(it.cardId) && cardById(it.cardId).chapterId) +
          (it.synName ? ' · ' + it.synName : ''),
        href: '#/card/' + it.cardId + '?p=' + it.pageIdx, score: s
      });
    });
    /* 仅出现在练习数据里的方剂名（没有原文位置）：仍列出，但不可点 */
    (QB.formulas || []).forEach(function (f) {
      var nm = f && f.name;
      if (!nm || seen[nm]) return;
      var k = norm(nm), s = 0;
      if (k === q) s = 850; else if (k.indexOf(q) === 0) s = 820; else if (k.indexOf(q) >= 0) s = 780;
      if (!s) return;
      seen[nm] = 1;
      out.push({ type: 'formula', name: nm, sub: '方剂 · ' + (f.source || '原书'), href: '', score: s - 30 });
    });
    return out;
  }

  function searchAll(kw) {
    var raw = String(kw == null ? '' : kw).trim();
    var q = norm(raw);
    var out = { q: raw, cards: [], syns: [], formulas: [], pages: [], subs: [] };
    if (!q) return out;

    /* ① 卡片名 / 显示名 */
    CARDS.forEach(function (c) {
      var n = norm(c.name), d = norm(c.displayName || c.name);
      var s = 0;
      if (n === q || d === q) s = 1000;
      else if (n.indexOf(q) === 0 || d.indexOf(q) === 0) s = 900;
      else if (n.indexOf(q) >= 0 || d.indexOf(q) >= 0) s = 800;
      if (!s) return;
      out.cards.push({
        type: 'card', cardId: c.id, name: c.displayName || c.name,
        sub: chapLabel(c.chapterId) + (c.kind === 'chapter' ? ' · 本章概述' : c.kind === 'attach' ? ' · 附病' : c.kind === 'sub' ? ' · 子病证' : ''),
        href: '#/card/' + c.id, score: s
      });
    });

    /* 逐卡逐页扫描：证型名 / 页正文 / 小标题 */
    var synSeen = {}, pageSeen = {};
    CARDS.forEach(function (c) {
      var chap = chapLabel(c.chapterId);
      (c.pages || []).forEach(function (pg, pi) {
        var href = '#/card/' + c.id + '?p=' + pi;
        var pageHitText = [];
        (function walk(bs) {
          (bs || []).forEach(function (b) {
            if (!b) return;
            if (b.t === 'sub') {
              /* 小标题命中 */
              if (b.title && norm(b.title).indexOf(q) >= 0) {
                out.subs.push({
                  type: 'sub', cardId: c.id, pageIdx: pi, hit: b.title,
                  name: (c.displayName || c.name) + ' · ' + pg.title,
                  sub: chap + ' · 第 ' + (pi + 1) + ' 页 · 标题命中',
                  href: href, score: 620 + Math.min(20, String(b.title).length)
                });
              }
              walk(b.blocks);
              return;
            }
            if (b.t === 'h' && b.x && norm(b.x).indexOf(q) >= 0) {
              out.subs.push({
                type: 'sub', cardId: c.id, pageIdx: pi, hit: b.x,
                name: (c.displayName || c.name) + ' · ' + pg.title,
                sub: chap + ' · 第 ' + (pi + 1) + ' 页 · 标题命中',
                href: href, score: 620 + Math.min(20, String(b.x).length)
              });
            }
            if (b.t === 'syn' && b.name && norm(b.name).indexOf(q) >= 0) {
              var key = c.id + '|' + pi + '|' + b.sid;
              if (!synSeen[key]) {
                synSeen[key] = 1;
                out.syns.push({
                  type: 'syndrome', cardId: c.id, pageIdx: pi, sid: b.sid || '',
                  name: b.name, sub: '证型 · ' + (c.displayName || c.name) + ' · 第 ' + (pi + 1) + ' 页 ' + (pg.title || ''),
                  href: href, score: 900
                });
              }
            }
            if (b.t === 'p' || b.t === 'syn' || b.t === 'table' || b.t === 'img') {
              pageHitText.push(blocksText([b]));
            }
          });
        })(pg.blocks);
        /* 页正文命中 */
        var ptxt = blocksText(pg.blocks);
        var n = countOf(norm(ptxt), q);
        if (n > 0) {
          var pkey = c.id + '|' + pi;
          if (!pageSeen[pkey]) {
            pageSeen[pkey] = 1;
            out.pages.push({
              type: 'page', cardId: c.id, pageIdx: pi, pageTitle: pg.title || '',
              name: (c.displayName || c.name) + ' · ' + (pg.title || ('第 ' + (pi + 1) + ' 页')),
              sub: chap + ' · 出现 ' + n + ' 次',
              n: n, snip: snippetOf(ptxt, raw), href: href, score: 100 + Math.min(n, 6) * 12
            });
          }
        }
      });
    });

    out.formulas = formulaHit(q);

    function cmp(a, b) { return b.score - a.score || String(a.name || '').localeCompare(String(b.name || '')); }
    ['cards', 'syns', 'formulas', 'pages', 'subs'].forEach(function (k) { out[k].sort(cmp); });
    return out;
  }

  window.WK = {
    MAT: MAT, QB: QB, matBy: cardBy, cardBy: cardBy, chapBy: chapBy,
    cards: CARDS, chapters: CHAPS, order: order, orderIndex: orderIndex,
    stats: MAT.stats || {},
    store: store, save: save, persist: persist,
    esc: esc, inline: inline, shuffle: shuffle, uniq: uniq, nowText: nowText, clip: clip, norm: norm,
    renderRich: renderRich, blockHTML: blockHTML, tableHTML: tableHTML, blocksText: blocksText, pageText: pageText,
    cardById: cardById, chapterById: chapterById, cardsOfChapter: cardsOfChapter,
    chapterCard: chapterCard, chapterSequence: chapterSequence, isChapterCard: isChapterCard,
    cardPageCount: cardPageCount, cardKindLabel: cardKindLabel, navCard: navCard,
    viewCard: viewCard, clearEdits: clearEdits,
    pagePText: pagePText, splitParas: splitParas, replacePageP: replacePageP, savePageEdit: savePageEdit,
    note: note, setNote: setNote, isFav: isFav, toggleFav: toggleFav,
    isHidden: isHidden, setHidden: setHidden, hiddenCount: hiddenCount, favCards: favCards,
    qbChapters: qbChapters, qbChapterOf: qbChapterOf, qbOf: qbOf, qbById: qbById,
    syOf: syOf, isExam: isExam, examDiseases: examDiseases, diseaseLabel: diseaseLabel,
    dname: dname, chapLabel: chapLabel, syndromeHref: syndromeHref,
    searchAll: searchAll
  };
})();
