/* 页面标注：整页可画，痕迹按「页面」存本地，切页/刷新/重开都在
   设计约束：
   - 不拦截正常阅读：标注关闭时画布 pointer-events:none
   - 页面滚动时画布跟着内容动，笔迹固定在它画的那个位置
   - 每停笔 400ms 落盘一次，避免频繁写
*/
(function () {
  'use strict';
  const KEY = 'alpa-ink-v1';
  // 页面标识：只认文件名与 id，忽略 ?v= ?t= 这类缓存参数，否则每次带参数访问都会算成另一页
  function pageKey() {
    const file = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
    const id = new URLSearchParams(location.search).get('id');
    return id ? file + '-' + id : file;
  }
  const PAGE = pageKey();

  const state = {
    on: false,
    color: '#B0470E',
    width: 3,
    strokes: [],       // [{c,w,d:[[x,y,p]...]}]
    cur: null,
    dirty: false,
    canvas: null, ctx: null,
    docH: 0,
  };

  /* ---------- 存储 ---------- */
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAll(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 配额满时静默 */ }
  }
  function persist() {
    if (!state.dirty) return;
    const db = loadAll();
    db[PAGE] = { v: 1, strokes: state.strokes };
    saveAll(db);
    state.dirty = false;
  }

  /* ---------- 画布 ---------- */
  function ensureCanvas() {
    if (state.canvas) return;
    const cv = document.createElement('canvas');
    cv.id = 'inkCanvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    state.canvas = cv;
    state.ctx = cv.getContext('2d');
  }

  function fitCanvas() {
    const cv = state.canvas;
    const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.docH = h;
    cv.style.height = h + 'px';
    cv.width = Math.floor(window.innerWidth * dpr);
    cv.height = Math.floor(h * dpr);
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function redraw() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, window.innerWidth, state.docH);
    state.strokes.forEach(s => drawStroke(ctx, s));
  }

  function drawStroke(ctx, s) {
    const pts = s.d;
    if (pts.length < 2) {
      ctx.beginPath();
      ctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = s.c; ctx.fill();
      return;
    }
    ctx.strokeStyle = s.c;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, p0] = pts[i - 1];
      const [x1, y1, p1] = pts[i];
      // 压感可用则按压力变化笔宽，否则等粗
      const pw = s.w * (0.35 + 0.65 * (p0 || 0.5));
      ctx.beginPath();
      ctx.lineWidth = pw;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }

  /* ---------- 输入 ---------- */
  function pos(e) {
    const r = state.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5];
  }

  function onDown(e) {
    if (!state.on) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { state.canvas.setPointerCapture?.(e.pointerId); } catch (err) {}
    state.cur = { c: state.color, w: state.width, d: [pos(e)] };
    state.strokes.push(state.cur);
    drawStroke(state.ctx, state.cur);
  }

  function onMove(e) {
    if (!state.on || !state.cur) return;
    e.preventDefault();
    const p = pos(e);
    const last = state.cur.d[state.cur.d.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.2) return;  // 滤掉抖动点
    state.cur.d.push(p);
    state.ctx.strokeStyle = state.cur.c;
    state.ctx.lineCap = 'round';
    state.ctx.lineWidth = state.cur.w * (0.35 + 0.65 * (last[2] || 0.5));
    state.ctx.beginPath();
    state.ctx.moveTo(last[0], last[1]);
    state.ctx.lineTo(p[0], p[1]);
    state.ctx.stroke();
    state.dirty = true;
    scheduleSave();
  }

  function onUp() {
    if (!state.cur) return;
    state.cur = null;
    state.dirty = true;
    scheduleSave();
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  /* ---------- 界面 ---------- */
  function bar() {
    const el = document.createElement('div');
    el.id = 'inkBar';
    el.innerHTML = `
      <button id="inkToggle" type="button" aria-pressed="false">标注</button>
      <span id="inkTools" hidden>
        <button type="button" data-c="#B0470E" style="--c:#B0470E" class="ink-dot" aria-label="橙色"></button>
        <button type="button" data-c="#1A4FA0" style="--c:#1A4FA0" class="ink-dot" aria-label="蓝色"></button>
        <button type="button" data-c="#15171A" style="--c:#15171A" class="ink-dot" aria-label="黑色"></button>
        <button type="button" data-c="#FFFFFF" style="--c:#FFFFFF" class="ink-dot" aria-label="白色"></button>
        <button type="button" id="inkThin" aria-label="细笔">细</button>
        <button type="button" id="inkThick" aria-label="粗笔">粗</button>
        <button type="button" id="inkUndo">撤销</button>
        <button type="button" id="inkClear">清空</button>
      </span>`;
    document.body.appendChild(el);
    return el;
  }

  function wire(el) {
    const toggle = el.querySelector('#inkToggle');
    const tools = el.querySelector('#inkTools');

    toggle.addEventListener('click', () => {
      state.on = !state.on;
      toggle.setAttribute('aria-pressed', String(state.on));
      toggle.classList.toggle('on', state.on);
      tools.hidden = !state.on;
      state.canvas.style.pointerEvents = state.on ? 'auto' : 'none';
      document.body.classList.toggle('inking', state.on);
      if (state.on) fitCanvas();
    });

    el.querySelectorAll('.ink-dot').forEach(b => b.addEventListener('click', () => {
      state.color = b.dataset.c;
      el.querySelectorAll('.ink-dot').forEach(x => x.classList.toggle('sel', x === b));
    }));
    el.querySelector('.ink-dot').classList.add('sel');

    el.querySelector('#inkThin').addEventListener('click', () => { state.width = 2; });
    el.querySelector('#inkThick').addEventListener('click', () => { state.width = 5; });
    el.querySelector('#inkUndo').addEventListener('click', () => {
      state.strokes.pop(); state.dirty = true; persist(); redraw();
    });
    el.querySelector('#inkClear').addEventListener('click', () => {
      if (!state.strokes.length) return;
      if (!confirm('清空这一页的全部笔迹？此操作不能撤销。')) return;
      state.strokes = []; state.dirty = true; persist(); redraw();
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    ensureCanvas();
    const db = loadAll();
    state.strokes = (db[PAGE] && db[PAGE].strokes) || [];
    wire(bar());
    fitCanvas();
    redraw();

    state.canvas.addEventListener('pointerdown', onDown, { passive: false });
    state.canvas.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // 内容高度变化（比如筛选、图片加载完）时重排画布
    let rz = null;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(fitCanvas, 200); });
    if (window.ResizeObserver) new ResizeObserver(() => {
      const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (Math.abs(h - state.docH) > 24) { clearTimeout(rz); rz = setTimeout(fitCanvas, 250); }
    }).observe(document.body);

    // 离开前落盘
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  }

  // 等主程序把页面渲染完再初始化，否则画布按空页高度算
  function boot() {
    if (!document.querySelector('main')) { setTimeout(boot, 60); return; }
    // 再等一帧，让首屏排版落定
    requestAnimationFrame(() => requestAnimationFrame(init));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();