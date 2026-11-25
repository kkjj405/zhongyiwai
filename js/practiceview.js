/* 中医外科学 · 练习：默写 / 选择题 / 范围设置 / 草稿 / 自评 / 退出守卫
 *
 * 设计要点（交接单 §5.3 + 用户 2026-11-25 追加要求）：
 *   · 没有固定题库！题目一律在运行时由 window.WK_QB（病证/证型/治法/方药）现算生成；
 *     选项与顺序每次进入 / 每组重开都重新随机，不写进 store。
 *   · 默写：一屏一个病证，该病证每个证型一块（块头只写「证型 i」，不显示证型名），
 *     每块 3 小题（①证候名称 ②治法 ③方药）；提交后不判分，只给答案 + 「我答对了/我答错了」自评。
 *   · 选择题：一屏一个病证，3 个多选小题（证型集合 / 治法集合 / 方药集合），集合完全相等才算对。
 *   · 附病不进题目池；无证型的病证在设置页灰显「无辨证论治」。
 *   · 草稿最多 5 份，输入变化 800ms 防抖保存；退出前确认（自动保存）。
 */
(function () {
  'use strict';
  var Z = window.WK, UI = window.WK_UI;
  var esc = Z.esc, icon = UI.icon;

  var LETTERS = 'ABCDEFGHIJKL';      /* 12 个字母，选项上限 12，绝不 undefined */
  var MAX_OPT = 12;
  var MAX_DRAFTS = 5;
  var SAVE_MS = 800;                 /* 输入变化防抖保存 */
  var MAX_CORRECT_SHOW = 6;          /* 正确项 > 6 时随机取 6 个并注明 */

  var st = { mode: 'mo', sel: {}, open: {}, order: 'random' };
  var run = null;                    /* 当前练习（运行态；不持久化题目对象） */
  var curMain = null;                /* 当前 main 容器（练习页内部重绘用） */
  var saveTimer = null;
  var guardBusy = false;

  /* 三个维度（默写与选择题共用同一套数据来源） */
  var DIMS = [
    {
      k: 'name', no: '①', label: '证候名称', long: '证候（证型）',
      ph: '默写该证型的证候名称（如 热毒蕴结证）',
      get: function (d) { return uniq(Z.syOf(d).map(function (s) { return s && s.name; })); }
    },
    {
      k: 'treat', no: '②', label: '治法', long: '治法',
      ph: '默写该证型的治法（如 清热解毒。）',
      get: function (d) { return uniq(Z.syOf(d).map(function (s) { return s && s.treat; })); }
    },
    {
      k: 'formula', no: '③', label: '方药', long: '方药',
      ph: '默写该证型的方药（方名与加减）',
      get: function (d) {
        var out = [];
        Z.syOf(d).forEach(function (s) { (s && s.formulaNames || []).forEach(function (f) { out.push(f); }); });
        return uniq(out);
      }
    }
  ];
  function dimOf(k) { return DIMS.filter(function (x) { return x.k === k; })[0]; }
  function letter(i) { return LETTERS.charAt(i) || '?'; }
  function uniq(a) {
    var out = [], seen = {};
    (a || []).forEach(function (x) {
      var v = String(x == null ? '' : x).trim();
      if (!v || seen[v]) return;
      seen[v] = 1; out.push(v);
    });
    return out;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function modeLabel(m) { return m === 'tc' ? '选择题' : '默写'; }
  function dname(d) { return Z.dname ? Z.dname(d) : ((d && (d.displayName || d.name)) || ''); }
  function newKey(mode, ids) { return mode + '|' + ids.slice().sort().join(','); }

  /* ================= 数据辅助 ================= */
  function examOf(chapterId) { return Z.qbOf(chapterId).filter(Z.isExam); }
  function examDiseases() { return Z.examDiseases(); }
  function formatOf(s, k) {
    if (!s) return '';
    if (k === 'name') return s.name || '';
    if (k === 'treat') return s.treat || '';
    var full = s.formulaFull || (s.formulaNames || []).join('、');
    return full || '';
  }
  function selIds() {
    return (Z.QB.diseases || []).map(function (d) { return d.id; }).filter(function (id) {
      var d = Z.qbById(id);
      return st.sel[id] && Z.isExam(d);
    });
  }
  function selCount() {
    var ids = selIds(), n = 0;
    ids.forEach(function (id) { n += Z.syOf(Z.qbById(id)).filter(function (s) { return s && s.name; }).length; });
    return { diseases: ids.length, syndromes: n };
  }
  function chapterTri(chId) {
    var list = examOf(chId), n = 0;
    list.forEach(function (d) { if (st.sel[d.id]) n++; });
    return { n: n, total: list.length, all: list.length > 0 && n === list.length, half: n > 0 && n < list.length };
  }
  function doneOf(r) {
    if (!r) return 0;
    if (r.mode === 'mo') return Object.keys(r.submitted || {}).length;
    return Object.keys(r.doneIds || {}).length;
  }
  function totalOf(r) { return r ? r.ids.length : 0; }

  /* ================= 选择题：选项生成（§5.3.B） ================= */
  /* 干扰池：其他病证（含附病，附病只是不当被考病证）的同维度值；同章优先，不足再用全书。 */
  function poolSplit(d, k) {
    var same = [], other = [];
    (Z.QB.diseases || []).forEach(function (x) {
      if (!x || x.id === d.id) return;
      var vals = dimOf(k).get(x);
      if (x.chapterId === d.chapterId) same = same.concat(vals);
      else other = other.concat(vals);
    });
    return { same: uniq(same), other: uniq(other) };
  }
  /* 生成一道多选小题；该维度没有答案时返回 null（调用方不显示该小题）。 */
  function buildChoiceQ(d, k) {
    if (!d) return null;
    var dim = dimOf(k);
    var all = dim.get(d);
    if (!all.length) return null;
    var capped = false;
    var correct = all;
    if (correct.length > MAX_CORRECT_SHOW) { correct = Z.shuffle(correct).slice(0, MAX_CORRECT_SHOW); capped = true; }
    var cn = correct.length;
    var decoyN = clamp(Math.round(cn * 0.6), 2, MAX_OPT - cn);
    var correctSet = {};
    correct.forEach(function (x) { correctSet[x] = 1; });
    var p = poolSplit(d, k);
    var picks = [], seen = {};
    function take(arr) {
      var s = Z.shuffle(arr);
      for (var i = 0; i < s.length && picks.length < decoyN; i++) {
        var v = s[i];
        if (!v || correctSet[v] || seen[v]) continue;
        seen[v] = 1; picks.push(v);
      }
    }
    take(p.same);
    if (picks.length < decoyN) take(p.other);
    var opts = Z.shuffle(correct.concat(picks));
    var correctIdx = correct.map(function (x) { return opts.indexOf(x); })
      .filter(function (i) { return i >= 0; }).sort(function (a, b) { return a - b; });
    var notes = [];
    notes.push('多选');
    if (cn === 1) notes.push('1 个正确项');
    if (capped) notes.push('本题列出其中 ' + MAX_CORRECT_SHOW + ' 个');
    var stem = (k === 'name')
      ? '「' + dname(d) + '」的证候（证型）包括以下哪些？'
      : '「' + dname(d) + '」各证型的' + dim.long + '包括以下哪些？';
    return {
      dim: k, dimLabel: dim.long, correctText: correct.slice(),
      stem: stem,
      opts: opts, correct: correctIdx, chosen: [], done: false, notes: notes,
      note: notes.join(' · ')
    };
  }
  /* 一个病证的三个小题（每次调用都重新随机；缺失维度自动跳过） */
  function buildGroup(d) {
    return DIMS.map(function (dim) { return buildChoiceQ(d, dim.k); }).filter(Boolean);
  }
  function sameSet(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    var s = a.slice().sort(function (x, y) { return x - y; }).join(',');
    return s === b.slice().sort(function (x, y) { return x - y; }).join(',');
  }

  /* ================= 运行态 ================= */
  function newRun(mode, ids) {
    var order = ids.slice();
    if (st.order !== 'catalog') order = Z.shuffle(order);
    return {
      mode: mode, ids: order, i: 0, ts: Date.now(),
      key: newKey(mode, order),
      /* 默写 */
      answers: {}, submitted: {}, eval: {},
      /* 选择题 */
      res: {}, doneIds: {}, qcache: {},
      finished: false, recorded: false
    };
  }
  function curDisease() {
    if (!run) return null;
    return Z.qbById(run.ids[run.i]) || null;
  }

  /* ================= 草稿（最多 5 份） ================= */
  function captureMo() {
    if (!run || run.mode !== 'mo') return;
    var d = curDisease(); if (!d) return;
    var box = document.getElementById('mo-box');
    if (!box) return;
    var ans = run.answers[d.id] || (run.answers[d.id] = { syn: {} });
    box.querySelectorAll('[data-mo-syn]').forEach(function (inp) {
      var sid = inp.getAttribute('data-mo-syn');
      var f = inp.getAttribute('data-mo-f');
      ans.syn[sid] = ans.syn[sid] || {};
      ans.syn[sid][f] = inp.value;
    });
  }
  function saveDraft(silent) {
    if (!run) return false;
    captureMo();
    var d = curDisease();
    var snap = {
      key: run.key, mode: run.mode, ids: run.ids.slice(), i: run.i, ts: Date.now(),
      answers: run.answers, submitted: run.submitted, eval: run.eval,
      res: run.res, doneIds: run.doneIds,
      title: modeLabel(run.mode) + ' · ' + (d ? dname(d) : (run.ids.length + ' 个病证')),
      progress: doneOf(run) + '/' + totalOf(run)
    };
    var list = (Z.store.drafts || []).filter(function (x) { return x.key !== run.key; });
    list.unshift(snap);
    Z.store.drafts = list.slice(0, MAX_DRAFTS);
    Z.save(true);
    if (!silent) UI.toast('练习已保存，可在练习页继续');
    return true;
  }
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; saveDraft(true); }, SAVE_MS);
  }
  function dropDraft(key) {
    Z.store.drafts = (Z.store.drafts || []).filter(function (x) { return x.key !== key; });
    Z.save(true);
  }
  function addRecord(mode, total, right) {
    var rec = {
      ts: Date.now(), mode: mode, total: total, right: right,
      rate: total ? Math.round(right * 100 / total) : 0,
      title: modeLabel(mode)
    };
    Z.store.prec = [rec].concat(Z.store.prec || []).slice(0, 20);
    Z.save(true);
  }

  /* ================= 底部固定条 ================= */
  function clearBar() {
    var b = document.getElementById('pr-bar');
    if (b && b.parentNode) b.parentNode.removeChild(b);
    var m = document.getElementById('main');
    if (m) m.classList.remove('has-bar');
  }
  function setBar(html, ready) {
    clearBar();
    if (!html) return null;
    var el = document.createElement('div');
    el.id = 'pr-bar';
    el.className = 'pr-bar';
    el.innerHTML = html;
    document.getElementById('app').appendChild(el);
    var m = document.getElementById('main');
    if (m) m.classList.add('has-bar');
    if (ready) ready(el);
    return el;
  }

  /* ================= 练习首页 ================= */
  function renderHome(main) {
    curMain = main;
    clearBar();
    UI.header({ title: '练习', sub: '默写 · 选择题' });
    var h = [];
    h.push('<div class="card flat" style="padding:11px 13px;background:var(--blue-l);border-color:#e2d3dc">' +
      '<div class="small" style="line-height:1.75;color:var(--brown-d)">练习不判自动分：默写提交后自己对照答案点「我答对了 / 我答错了」；选择题集合完全正确才算对。' +
      '中途退出会自动保存，最多保留 ' + MAX_DRAFTS + ' 份，可在本页继续。</div></div>');
    h.push('<div class="tile-grid">' +
      '<a class="tile big-tile" href="#/setup/mo"><div class="t-ic">✍</div><div class="t-t">默写</div>' +
      '<div class="t-s">一个病证一屏<br>每证型 3 空 · 可自评</div></a>' +
      '<a class="tile big-tile" href="#/setup/tc"><div class="t-ic">☑</div><div class="t-t">选择题</div>' +
      '<div class="t-s">每病证 3 个多选<br>集合全对才算对</div></a></div>');
    var drafts = (Z.store.drafts || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    h.push('<div class="card"><div class="row between mb6"><b>未完成练习（草稿）</b><span class="tiny dim">最多 ' + MAX_DRAFTS + ' 份</span></div>');
    if (!drafts.length) {
      h.push('<p class="small muted" style="margin:4px 0 0">暂无。练习中途退出会自动保存到这里。</p>');
    } else {
      drafts.forEach(function (dr, i) {
        h.push('<div class="draft-row"><div class="grow"><div class="d-t">' + esc(dr.title || '练习') + '</div>' +
          '<div class="d-s">' + esc(Z.nowText(dr.ts)) + ' · 进度 ' + esc(dr.progress || '') + '</div></div>' +
          '<button class="btn xs primary" data-dres="' + i + '">继续</button>' +
          '<button class="btn xs danger" data-ddel="' + i + '">删除</button></div>');
      });
    }
    h.push('</div>');
    var recs = Z.store.prec || [];
    h.push('<div class="card"><div class="row between mb6"><b>最近记录</b><span class="tiny dim">最多 20 条</span></div>');
    if (!recs.length) {
      h.push('<p class="small muted" style="margin:4px 0 0">还没有完成过练习。</p>');
    } else {
      recs.slice(0, 8).forEach(function (r) {
        h.push('<div class="rec-row"><span class="grow">' + esc(modeLabel(r.mode)) + ' · ' + esc(Z.nowText(r.ts)) + '</span>' +
          '<span class="tiny dim">' + r.right + '/' + r.total + '</span>' +
          '<span class="rec-rate">' + r.rate + '%</span></div>');
      });
    }
    h.push('</div>');
    h.push('<div class="card flat"><p class="small muted" style="margin:0">提示：范围里只列出「有证型的非附病病证」；附病（灰显「附病·不考」）与无辨证论治的病证不参与出题。</p></div>');
    main.innerHTML = h.join('');

    main.querySelectorAll('[data-dres]').forEach(function (b) {
      b.onclick = function () {
        var dr = (Z.store.drafts || [])[+b.getAttribute('data-dres')];
        if (!dr) { UI.toast('记录不存在'); return; }
        run = JSON.parse(JSON.stringify(dr));
        run.qcache = {}; run.finished = false; run.recorded = false;
        st.mode = run.mode; st.order = 'catalog';
        UI.go('#/run');
      };
    });
    main.querySelectorAll('[data-ddel]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-ddel');
        var dr = (Z.store.drafts || [])[i];
        if (!dr) return;
        UI.confirmDialog('删除草稿', '确定删除这份未完成练习？', '删除', '取消').then(function (ok) {
          if (!ok) return;
          Z.store.drafts.splice(i, 1); Z.save(true); renderHome(main);
        });
      };
    });
  }

  /* ================= 设置页（两种模式共用） ================= */
  function renderSetup(main) {
    curMain = main;
    UI.header({ title: modeLabel(st.mode) + ' · 设置', back: true, backTo: '#/practice' });
    var c = selCount();
    var h = [];
    h.push('<div class="card"><div class="row between mb8"><b>练习范围</b>' +
      '<span class="range-stat">已选 <b id="sel-d">' + c.diseases + '</b> 个病证 · <b id="sel-s">' + c.syndromes + '</b> 个证型</span></div>' +
      '<div class="row wrap" style="gap:7px;margin-bottom:8px">' +
      '<button class="btn xs" id="sel-all">全选</button>' +
      '<button class="btn xs" id="sel-none">清空</button>' +
      '<span class="fld-note" style="margin-left:auto;align-self:center">附病 / 无证型病证不参与</span></div>');
    h.push('<div id="rg-list">');
    Z.qbChapters().forEach(function (ch, ci) {
      var ds = Z.qbOf(ch.id);
      if (!ds.length) return;
      var tri = chapterTri(ch.id);
      var open = !!st.open[ch.id] || (ci === 0 && st.open.__init !== 1);
      h.push('<div class="rg-chap' + (open ? ' open' : '') + '" data-rg="' + ch.id + '">' +
        '<div class="rg-hd"><span class="rg-box' + (tri.all ? ' all' : tri.half ? ' half' : '') +
        '" data-chk="' + ch.id + '"></span>' +
        '<span class="rg-nm">' + esc((ch.no ? ch.no + '　' : '') + ch.name) + '</span>' +
        '<span class="rg-n">' + tri.n + '/' + tri.total + '</span><span class="rg-chev">›</span></div><div class="rg-bd">');
      ds.forEach(function (d) {
        var exam = Z.isExam(d);
        var nSy = Z.syOf(d).length;
        if (!exam) {
          var why = d.kind === 'attach' ? '附病·不考' : '无辨证论治';
          h.push('<div class="pick dis"><input type="checkbox" disabled><span class="pk-nm">' + esc(dname(d)) +
            '</span><span class="pk-s">' + why + '</span></div>');
        } else {
          h.push('<label class="pick"><input type="checkbox" data-dsel="' + d.id + '"' + (st.sel[d.id] ? ' checked' : '') + '>' +
            '<span class="pk-nm">' + esc(dname(d)) + '</span><span class="pk-s">' + nSy + ' 证型</span></label>');
        }
      });
      h.push('</div></div>');
    });
    st.open.__init = 1;
    h.push('</div></div>');
    h.push('<div class="card"><div class="row between mb8"><b>出题顺序</b><span class="tiny dim">选择题每次进入都会重新随机</span></div>' +
      '<div class="seg" id="seg-order"><button data-ord="random" class="' + (st.order !== 'catalog' ? 'on' : '') + '">随机</button>' +
      '<button data-ord="catalog" class="' + (st.order === 'catalog' ? 'on' : '') + '">按目录顺序</button></div></div>');
    h.push('<div class="card flat"><p class="small muted" style="margin:0">默写：一屏一个病证，每个证型 3 空（①证候名称 ②治法 ③方药），提交后对照答案自评。' +
      '选择题：一屏一个病证，3 个多选小题（证型集合 / 治法集合 / 方药集合），集合完全相等才算对。</p></div>');
    main.innerHTML = h.join('');

    setBar('<div class="grow small dim" id="bar-hint">已选 ' + c.diseases + ' 个病证</div>' +
      '<button class="btn primary" id="start-btn"' + (c.diseases ? '' : ' disabled') + '>开始' + (st.mode === 'tc' ? '做题' : '默写') + '</button>');

    function refresh() {
      var cc = selCount();
      var n = main.querySelector('#sel-d'); if (n) n.textContent = cc.diseases;
      var m = main.querySelector('#sel-s'); if (m) m.textContent = cc.syndromes;
      var hint = document.getElementById('bar-hint');
      if (hint) hint.textContent = '已选 ' + cc.diseases + ' 个病证 · ' + cc.syndromes + ' 个证型';
      var sb = document.getElementById('start-btn');
      if (sb) sb.disabled = cc.diseases === 0;
      /* 章级三态 + 计数 */
      main.querySelectorAll('[data-rg]').forEach(function (row) {
        var cid = row.getAttribute('data-rg');
        var tri = chapterTri(cid);
        var box = row.querySelector('[data-chk]');
        if (box) box.className = 'rg-box' + (tri.all ? ' all' : tri.half ? ' half' : '');
        var cnt = row.querySelector('.rg-n');
        if (cnt) cnt.textContent = tri.n + '/' + tri.total;
      });
    }
    function setChap(cid, on) {
      examOf(cid).forEach(function (d) { if (on) st.sel[d.id] = 1; else delete st.sel[d.id]; });
      main.querySelectorAll('[data-dsel]').forEach(function (ck) {
        var d = Z.qbById(ck.getAttribute('data-dsel'));
        if (d && d.chapterId === cid) ck.checked = !!st.sel[d.id];
      });
      refresh();
    }
    main.querySelectorAll('[data-rg] .rg-hd').forEach(function (hd) {
      hd.onclick = function () {
        var row = hd.closest('[data-rg]');
        var cid = row.getAttribute('data-rg');
        var open = !row.classList.contains('open');
        row.classList.toggle('open', open);
        st.open[cid] = open;
      };
    });
    main.querySelectorAll('[data-chk]').forEach(function (box) {
      box.onclick = function (ev) {
        ev.stopPropagation();
        var cid = box.getAttribute('data-chk');
        var tri = chapterTri(cid);
        setChap(cid, !tri.all);
      };
    });
    main.querySelectorAll('[data-dsel]').forEach(function (ck) {
      ck.onchange = function () {
        var id = ck.getAttribute('data-dsel');
        if (ck.checked) st.sel[id] = 1; else delete st.sel[id];
        Z.store.sel = st.sel; Z.save();
        refresh();
      };
    });
    main.querySelector('#sel-all').onclick = function () {
      examDiseases().forEach(function (d) { st.sel[d.id] = 1; });
      main.querySelectorAll('[data-dsel]').forEach(function (ck) { ck.checked = true; });
      Z.store.sel = st.sel; Z.save(); refresh();
    };
    main.querySelector('#sel-none').onclick = function () {
      st.sel = {};
      main.querySelectorAll('[data-dsel]').forEach(function (ck) { ck.checked = false; });
      Z.store.sel = st.sel; Z.save(); refresh();
    };
    main.querySelectorAll('[data-ord]').forEach(function (b) {
      b.onclick = function () {
        st.order = b.getAttribute('data-ord');
        main.querySelectorAll('[data-ord]').forEach(function (x) { x.classList.toggle('on', x === b); });
      };
    });
    document.getElementById('start-btn').onclick = function () {
      var ids = selIds();
      if (!ids.length) { UI.toast('先勾选病证范围'); return; }
      run = newRun(st.mode, ids);
      UI.go('#/run');
    };
  }

  /* ================= 运行页 ================= */
  function renderRun(main) {
    curMain = main;
    clearBar();
    if (!run) { UI.replaceHash('#/practice'); return; }
    if (run.finished) { renderResult(main); return; }
    var d = curDisease();
    if (!d) { finishRun(); return; }
    /* 先渲染题面：选择题在本病证「最后一小题提交」当次会在 tcBody 里把本病证记入
       run.doneIds / run.res，所以进度文字必须放在题面之后取数，否则会慢一拍。 */
    var bodyHTML = run.mode === 'mo' ? moBody(d) : tcBody(d);
    var total = totalOf(run), done = doneOf(run);
    UI.header({
      title: dname(d), sub: modeLabel(run.mode) + ' · 第 ' + (run.i + 1) + '/' + total + ' 个病证',
      back: true, backTo: '#/practice',
      actions: [{ text: '结束', label: '结束练习', onClick: function () { requestExit(); } }]
    });
    var h = [];
    h.push('<div class="card flat" style="padding:9px 12px"><div class="row between" style="margin-bottom:5px">' +
      '<span class="small muted">' + (run.mode === 'mo' ? '已完成 ' + done + '/' + total + ' 个病证' :
        '已完成 ' + done + '/' + total + ' 个病证 · ' + tcScore().ok + '/' + tcScore().total + ' 小题') + '</span>' +
      '<span class="small muted">第 ' + (run.i + 1) + ' 个</span></div>' +
      '<div class="pbar"><i style="width:' + (total ? Math.round(done * 100 / total) : 0) + '%"></i></div></div>');
    h.push(bodyHTML);
    main.innerHTML = h.join('');
    if (run.mode === 'mo') bindMo(main, d); else bindTc(main, d);
  }

  /* ---------- 默写页 ---------- */
  function moAns(did, sid, f) {
    var a = (run.answers[did] || { syn: {} }).syn[sid] || {};
    return a[f] || '';
  }
  function moBody(d) {
    var submitted = !!run.submitted[d.id];
    var sy = Z.syOf(d).filter(function (s) { return s && s.name; });
    var h = ['<div class="card" id="mo-box">'];
    h.push('<div class="mo-hd"><span class="mo-nm">' + esc(dname(d)) + '</span>' +
      '<span class="mo-idx">第 ' + (run.i + 1) + '/' + totalOf(run) + ' 个病证 · 共 ' + sy.length + ' 个证型</span></div>');
    h.push('<div class="fld-note mb6">' + (submitted ? '已提交：下方为正确答案，请逐小题自评「我答对了 / 我答错了」。' :
      '按证型默写：① 证候名称 ② 治法 ③ 方药。回车换行，不会自动提交。') + '</div>');
    sy.forEach(function (s, si) {
      h.push('<div class="mo-syn" data-syn="' + s.id + '">' +
        '<div class="mo-syn-h"><span class="mo-tag">证型 ' + (si + 1) + '</span></div>');
      DIMS.forEach(function (dim) {
        var val = moAns(d.id, s.id, dim.k);
        var long = dim.k === 'formula';
        var fv = (((run.eval[d.id] || {})[s.id] || {})[dim.k]);
        h.push('<div class="mo-f"><label>' + dim.no + ' ' + dim.label + '</label><div class="grow">' +
          (long
            ? '<textarea class="textarea" rows="2" data-mo-syn="' + s.id + '" data-mo-f="' + dim.k + '"' +
              (submitted ? ' readonly' : '') + ' placeholder="' + esc(dim.ph) + '">' + esc(val) + '</textarea>'
            : '<input class="input" data-mo-syn="' + s.id + '" data-mo-f="' + dim.k + '" value="' + esc(val) + '"' +
              (submitted ? ' readonly' : '') + ' placeholder="' + esc(dim.ph) + '" enterkeyhint="next" autocomplete="off">') +
          '</div>');
        if (submitted) {
          h.push('<div class="an-key"><span class="ak-l">正确答案</span>' + esc(formatOf(s, dim.k) || '（原书未单列）') + '</div>');
          h.push('<div class="se-row">' +
            '<button class="se-btn' + (fv === 1 ? ' on-ok' : '') + '" data-mo-self="' + s.id + '|' + dim.k + '|1">我答对了</button>' +
            '<button class="se-btn' + (fv === 0 ? ' on-bad' : '') + '" data-mo-self="' + s.id + '|' + dim.k + '|0">我答错了</button>' +
            '</div>');
        }
        h.push('</div>');
      });
      if (submitted) {
        var cardHref = Z.syndromeHref ? Z.syndromeHref(s) : '';
        h.push('<details class="an-fold"><summary>查看该证型「证候」原文</summary>' +
          '<div class="an-clinic">' + esc(s.clinic || '（原书未单列）') + '</div></details>');
        if (cardHref) h.push('<div class="syn-go"><a class="btn xs" href="' + esc(cardHref) +
          '">' + icon('book') + '查看原卡片 ›</a></div>');
      }
      h.push('</div>');
    });
    h.push('</div>');
    h.push('<div class="pager-row">' +
      '<button class="btn sm" id="mo-prev"' + (run.i <= 0 ? ' disabled' : '') + '>‹ 上一题</button>' +
      '<button class="btn sm" id="mo-next">' + (run.i >= run.ids.length - 1 ? '完成本组 ›' : '下一题 ›') + '</button>' +
      (submitted ? '' : '<button class="btn sm primary" id="mo-submit">提交</button>') +
      '<button class="btn sm" id="mo-end">结束</button></div>');
    return h.join('');
  }
  function bindMo(main, d) {
    var box = main.querySelector('#mo-box');
    box.querySelectorAll('[data-mo-syn]').forEach(function (inp) {
      inp.oninput = function () { captureOne(d.id, inp); scheduleSave(); };
      if (inp.tagName === 'INPUT') {
        inp.addEventListener('keydown', function (ev) {
          /* 手机输入法回车不提交：Enter 只跳到下一个输入框 */
          if (ev.key === 'Enter') {
            ev.preventDefault();
            var all = Array.prototype.slice.call(box.querySelectorAll('[data-mo-syn]'));
            var k = all.indexOf(inp);
            if (all[k + 1]) { all[k + 1].focus(); }
          }
        });
      }
    });
    var sb = main.querySelector('#mo-submit');
    if (sb) sb.onclick = function () {
      captureMo();
      run.submitted[d.id] = 1;
      saveDraft(true);
      renderRun(document.getElementById('main'));
      window.scrollTo(0, 0);
    };
    main.querySelectorAll('[data-mo-self]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.getAttribute('data-mo-self').split('|');
        var sid = parts[0], f = parts[1], v = +parts[2];
        var ev = run.eval[d.id] || (run.eval[d.id] = {});
        var se = ev[sid] || (ev[sid] = {});
        if (se[f] === v) delete se[f]; else se[f] = v;
        if (!Object.keys(se).length) delete ev[sid];
        saveDraft(true);
        renderRun(document.getElementById('main'));
      };
    });
    main.querySelector('#mo-prev').onclick = function () { goDisease(-1); };
    main.querySelector('#mo-next').onclick = function () { goDisease(1); };
    main.querySelector('#mo-end').onclick = function () { requestExit(); };
  }
  function captureOne(did, inp) {
    var ans = run.answers[did] || (run.answers[did] = { syn: {} });
    var sid = inp.getAttribute('data-mo-syn'), f = inp.getAttribute('data-mo-f');
    ans.syn[sid] = ans.syn[sid] || {};
    ans.syn[sid][f] = inp.value;
  }

  /* ---------- 选择题页 ---------- */
  function tcScore() {
    var ok = 0, total = 0;
    Object.keys(run.res || {}).forEach(function (id) {
      ok += run.res[id].ok || 0; total += run.res[id].total || 0;
    });
    return { ok: ok, total: total };
  }
  function ensureQs(d) {
    if (!run.qcache[d.id]) run.qcache[d.id] = buildGroup(d);
    return run.qcache[d.id];
  }
  function tcBody(d) {
    var qs = ensureQs(d);
    var sy = Z.syOf(d);
    var allDone = qs.length > 0 && qs.every(function (q) { return q.done; });
    var h = ['<div class="card" id="tc-box">'];
    h.push('<div class="mo-hd"><span class="mo-nm">' + esc(dname(d)) + '</span>' +
      '<span class="mo-idx">第 ' + (run.i + 1) + '/' + totalOf(run) + ' 个病证 · ' + qs.length + ' 个多选小题</span></div>');
    h.push('<div class="fld-note mb6">每题可多选；所选集合与正确集合完全相等才算对。选项每次进入/重开都会重新随机。</div>');
    if (!qs.length) {
      h.push('<div class="empty">本病证没有可用于出题的辨证论治内容</div>');
    }
    qs.forEach(function (q, qi) {
      var no = ['①', '②', '③', '④'][qi] || String(qi + 1);
      h.push('<div class="pq' + (q.done ? ' done' : '') + '" data-q="' + qi + '">' +
        '<div class="pq-hd"><span class="pq-no">' + no + '</span>' +
        '<span class="pq-tag">' + esc(q.dimLabel) + '</span><span class="tiny dim">' + esc(q.note) + '</span></div>');
      h.push('<div class="pq-stem">' + esc(q.stem) + '</div>');
      h.push('<div class="pq-opts">');
      q.opts.forEach(function (o, oi) {
        var cls = '';
        if (q.done) {
          if (q.correct.indexOf(oi) >= 0) cls = ' right';
          if (q.chosen.indexOf(oi) >= 0 && q.correct.indexOf(oi) < 0) cls = ' wrong';
        } else if (q.chosen.indexOf(oi) >= 0) {
          cls = ' chosen';
        }
        h.push('<button class="q-opt' + cls + '" data-qo="' + qi + '-' + oi + '"' + (q.done ? ' disabled' : '') + '>' +
          '<span class="q-lt">' + letter(oi) + '</span><span class="q-ot">' + esc(o) + '</span></button>');
      });
      h.push('</div>');
      if (q.done) {
        var okAll = sameSet(q.chosen, q.correct);
        var right = q.correct.map(function (i) { return letter(i) + '. ' + q.opts[i]; }).join('；');
        h.push('<div class="q-res' + (okAll ? ' ok' : ' bad') + '">' + (okAll ? '✓ 回答正确' : '✗ 回答有误') +
          '<span class="q-key">正确答案：' + esc(right) + '</span></div>');
      } else {
        h.push('<div class="pq-ft"><span class="tiny dim">已选 ' + q.chosen.length + ' 项</span>' +
          '<button class="btn xs primary" data-qs="' + qi + '">提交本题</button></div>');
      }
      h.push('</div>');
    });
    if (allDone) {
      h.push('<div class="card"><div class="row between mb8"><b>本病证完整对照表</b><span class="tiny dim">' +
        sy.length + ' 个证型</span></div><div class="cmp-wrap"><table class="cmp-tbl"><thead><tr>' +
        '<th>证型</th><th>治法</th><th>方药</th></tr></thead><tbody>');
      sy.forEach(function (s) {
        var shref = Z.syndromeHref ? Z.syndromeHref(s) : '';
        h.push('<tr><td class="c-sy">' + (shref
          ? '<a href="' + esc(shref) + '">' + esc(s.name || '') + '</a>'
          : esc(s.name || '')) + '</td><td>' + esc(s.treat || '—') + '</td><td>' +
          esc(s.formulaFull || (s.formulaNames || []).join('、') || '—') + '</td></tr>');
      });
      h.push('</tbody></table></div></div>');
    }
    h.push('</div>');
    h.push('<div class="pager-row">' +
      '<button class="btn sm" id="tc-prev"' + (run.i <= 0 ? ' disabled' : '') + '>上一个病证</button>' +
      '<button class="btn sm" id="tc-next">' + (run.i >= run.ids.length - 1 ? '完成本组' : '下一个病证') + '</button>' +
      '<button class="btn sm" id="tc-end">结束</button></div>');
    if (allDone && !run.doneIds[d.id]) {
      run.doneIds[d.id] = 1;
      var okN = qs.filter(function (q) { return sameSet(q.chosen, q.correct); }).length;
      run.res[d.id] = { ok: okN, total: qs.length };
      Z.save();
    }
    return h.join('');
  }
  function bindTc(main, d) {
    var qs = ensureQs(d);
    main.querySelectorAll('[data-qo]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.getAttribute('data-qo').split('-');
        var qi = +parts[0], oi = +parts[1];
        var q = qs[qi];
        if (!q || q.done) return;
        var i = q.chosen.indexOf(oi);
        if (i >= 0) q.chosen.splice(i, 1); else q.chosen.push(oi);
        var box = b.closest('.pq');
        if (box) {
          box.querySelectorAll('[data-qo]').forEach(function (ob) {
            var o2 = +ob.getAttribute('data-qo').split('-')[1];
            ob.classList.toggle('chosen', q.chosen.indexOf(o2) >= 0);
          });
          var ft = box.querySelector('.pq-ft .tiny');
          if (ft) ft.textContent = '已选 ' + q.chosen.length + ' 项';
        }
        scheduleSave();
      };
    });
    main.querySelectorAll('[data-qs]').forEach(function (b) {
      b.onclick = function () {
        var qi = +b.getAttribute('data-qs');
        var q = qs[qi];
        if (!q || q.done) return;
        if (!q.chosen.length) { UI.toast('先选选项（可多选）'); return; }
        q.done = true;
        saveDraft(true);   /* 只存结果计数，不存题目 */
        renderRun(document.getElementById('main'));
        window.scrollTo(0, 0);
      };
    });
    main.querySelector('#tc-prev').onclick = function () { goDisease(-1); };
    main.querySelector('#tc-next').onclick = function () { goDisease(1); };
    main.querySelector('#tc-end').onclick = function () { requestExit(); };
  }

  function goDisease(dir) {
    if (!run) return;
    captureMo();
    saveDraft(true);
    var j = run.i + dir;
    if (j >= run.ids.length) { finishRun(); return; }
    if (j < 0) return;
    run.i = j;
    saveDraft(true);
    renderRun(document.getElementById('main'));
    window.scrollTo(0, 0);
  }

  /* ================= 结果页 / 结束 ================= */
  /* 默写统计：qRight/qTotal = 小题自评（已提交证型数 × 3）；syRight/syTotal = 按证型全对计 */
  function moStats(r) {
    var t = { qRight: 0, qTotal: 0, syRight: 0, syTotal: 0 };
    if (!r) return t;
    (r.ids || []).forEach(function (id) {
      var d = Z.qbById(id);
      if (!d || !((r.submitted || {})[id])) return;
      Z.syOf(d).forEach(function (sy) {
        if (!sy || !sy.name) return;
        t.syTotal++;
        var ev = ((r.eval || {})[id] || {})[sy.id] || {};
        var n = 0, hit = 0;
        DIMS.forEach(function (dim) {
          n++; t.qTotal++;
          if (ev[dim.k] === 1) { t.qRight++; hit++; }
        });
        if (n && hit === n) t.syRight++;
      });
    });
    return t;
  }
  function finishRun() {
    if (!run) { UI.replaceHash('#/practice'); return; }
    captureMo();
    run.finished = true;
    if (!run.recorded) {
      run.recorded = true;
      if (run.mode === 'mo') {
        var mst = moStats(run);
        addRecord('mo', mst.qTotal, mst.qRight);
      } else {
        var sc = tcScore();
        addRecord('tc', sc.total ? sc.total : 0, sc.ok);
      }
    }
    dropDraft(run.key);
    renderRun(document.getElementById('main'));
    window.scrollTo(0, 0);
  }
  function renderResult(main) {
    UI.header({ title: '练习结果', back: true, backTo: '#/practice' });
    var h = [];
    if (run.mode === 'mo') {
      var mst = moStats(run);
      var rate = mst.qTotal ? Math.round(mst.qRight * 100 / mst.qTotal) : 0;
      h.push('<div class="card pr-result"><div class="pr-num">' + mst.qRight + '/' + mst.qTotal + '</div>' +
        '<div class="pr-lb">小题自评正确（每个证型 3 小题）</div>' +
        '<div class="pr-line">本轮完成 <b>' + run.ids.length + '</b> 个病证 · 已提交 <b>' + run.ids.length + '</b> 个病证（' +
        mst.syTotal + ' 个证型 × 3 = ' + mst.qTotal + ' 小题）<br>' +
        '小题正确 <b>' + mst.qRight + '/' + mst.qTotal + '</b> · 小题正确率 <b>' + rate + '%</b><br>' +
        '（按证型全对计）证型正确 <b>' + mst.syRight + '/' + mst.syTotal + '</b></div></div>');
    } else {
      var sc = tcScore();
      var doneN = Object.keys(run.res || {}).length;
      var rate2 = sc.total ? Math.round(sc.ok * 100 / sc.total) : 0;
      h.push('<div class="card pr-result"><div class="pr-num">' + rate2 + '%</div>' +
        '<div class="pr-lb">本组正确率</div>' +
        '<div class="pr-line">本组共 <b>' + (run.ids.length * 3) + '</b> 小题（' + run.ids.length + ' 个病证 × 3）<br>' +
        '已作答 <b>' + doneN + '</b> 个病证 · 答对 <b>' + sc.ok + '</b> 小题 · 答错 <b>' +
        (sc.total - sc.ok) + '</b> 小题（已答 ' + sc.total + '）</div></div>');
    }
    h.push('<div class="row mt10" style="gap:8px"><button class="btn" id="rs-home">返回练习页</button>' +
      '<button class="btn primary grow" id="rs-again">再来一组（重新随机）</button></div>');
    h.push('<div class="card flat mt10"><p class="small muted" style="margin:0">「再来一组」会按同一范围重新随机出题；' +
      (run.mode === 'mo' ? '默写答案与自评会清空。' : '选项与顺序全部重新生成。') + '</p></div>');
    main.innerHTML = h.join('');
    main.querySelector('#rs-home').onclick = function () { clearRun(); UI.replaceHash('#/practice'); };
    main.querySelector('#rs-again').onclick = function () {
      var mode = run.mode, ids = run.ids.slice();
      run = newRun(mode, ids);
      renderRun(document.getElementById('main'));
      window.scrollTo(0, 0);
    };
  }
  function clearRun() { saveTimer && clearTimeout(saveTimer); saveTimer = null; run = null; }

  /* ================= 退出守卫 ================= */
  function requestExit() {
    if (!run) { UI.replaceHash('#/practice'); return; }
    captureMo();
    saveDraft(true);
    UI.dialog({
      title: '退出练习',
      html: '退出后已回答的内容会<b>自动保存</b>，可在练习页继续（最多保存 ' + MAX_DRAFTS + ' 份）。<br>确定退出？',
      buttons: [{ text: '继续练习', value: false }, { text: '退出并保存', value: true, primary: true }]
    }).then(function (ok) {
      if (!ok) return;
      clearRun();
      UI.replaceHash('#/practice');
    });
  }
  /* 点任意站内链接离开练习 → 先确认 */
  document.addEventListener('click', function (ev) {
    if (!run || run.finished) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    var a = t.closest('a[href^="#/"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.indexOf('#/run') === 0 || href.indexOf('#/setup') === 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    captureMo();
    saveDraft(true);
    UI.dialog({
      title: '退出练习',
      html: '退出后已回答的内容会<b>自动保存</b>，可在练习页继续。确定离开？',
      buttons: [{ text: '继续练习', value: false }, { text: '退出并保存', value: true, primary: true }]
    }).then(function (ok) {
      if (!ok) return;
      clearRun();
      try { history.pushState(null, '', href); } catch (e) { location.hash = href; }
      UI.render();
    });
  }, true);
  /* 系统返回键：练习中先弹确认（壳子 ui.js 的 DS_BACK 会调用） */
  window.WK_BACK_GUARD = function () {
    if (!run) return false;
    if (run.finished) return false;
    requestExit();
    return true;
  };
  /* hash 被外部改掉（浏览器后退 / 手动改地址）时，先拦回来确认 */
  (function hookRender() {
    var orig = UI.render;
    UI.render = function () {
      var h = location.hash || '#/home';
      if (run && !run.finished && h.indexOf('#/run') !== 0 && !guardBusy) {
        guardBusy = true;
        try { history.replaceState(null, '', '#/run'); } catch (e) { }
        saveDraft(true);
        UI.dialog({
          title: '退出练习',
          html: '退出后已回答的内容会<b>自动保存</b>，可在练习页继续。确定退出？',
          buttons: [{ text: '继续练习', value: false }, { text: '退出并保存', value: true, primary: true }]
        }).then(function (ok) {
          guardBusy = false;
          if (!ok) return;
          clearRun();
          if (location.hash === h) UI.render(); else location.hash = h;
        });
        return;
      }
      clearBar();
      return orig.apply(UI, arguments);
    };
  })();
  window.addEventListener('beforeunload', function (e) {
    if (run && !run.finished) {
      captureMo();
      saveDraft(true);
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ================= 视图注册 ================= */
  UI.VIEWS.practice = function (main) {
    /* 从设置页返回时保留勾选；从别的 tab 进来也保留，方便连续练 */
    st.mode = 'mo';
    renderHome(main);
  };
  UI.VIEWS.setup = function (main, p) {
    st.mode = (p[0] === 'tc') ? 'tc' : 'mo';
    if (Z.store.sel && Object.keys(Z.store.sel).length) st.sel = Z.store.sel;
    renderSetup(main);
  };
  UI.VIEWS.run = function (main) {
    renderRun(main);
  };

  /* ================= 调试 / selftest 接口 ================= */
  window.WK_PRACTICE = {
    LETTERS: LETTERS, MAX_OPT: MAX_OPT, MAX_DRAFTS: MAX_DRAFTS,
    letter: letter,
    _buildChoiceQ: buildChoiceQ,
    _buildGroup: buildGroup,
    _dim: dimOf,
    _examDiseases: examDiseases,
    _poolSplit: poolSplit,
    _sameSet: sameSet,
    _start: function (mode, ids) { run = newRun(mode || 'mo', ids || examDiseases().map(function (d) { return d.id; })); return run; },
    _run: function () { return run; },
    _setRun: function (r) { run = r; },
    _setOrder: function (o) { st.order = o; },
    _setSel: function (s) { st.sel = s || {}; },
    _sel: function () { return st.sel; },
    _saveDraft: saveDraft,
    _finish: finishRun,
    _clear: function () { clearRun(); },
    _dims: DIMS,
    _moStats: function () { return moStats(run); }
  };
})();
