/* ALPA 粉体选型知识库 · 前端（原生 JS，无依赖）
   一个 kb.json 即全库。页面通过 data-view 决定渲染哪个视图。 */
const KB = { data: null, idx: [] };

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function boot() {
  const res = await fetch('kb.json', { cache: 'no-cache' });
  KB.data = await res.json();
  buildIndex();
  render();
  document.addEventListener('click', e => {
    if (!e.target.closest('.searchbox')) $('#hits')?.classList.remove('on');
  });
}

/* ---------- 搜索索引 ---------- */
function buildIndex() {
  const d = KB.data, out = [];
  d.products.forEach(p => out.push({
    t: p.cn, s: `${p.en} · ${p.series?.join(' / ') || p.cname}`,
    u: `product.html?id=${p.id}`,
    txt: [p.cn, p.en, p.cname, (p.series || []).join(' '), Object.values(p.size_range || {}).join(' '),
      (p.applications || []).join(' '), (p.features || []).join(' '), (p.constraints || []).join(' ')].join(' ')
  }));
  d.industries.forEach(i => out.push({
    t: i.cn, s: '行业方案', u: `industry.html?id=${i.id}`,
    txt: [i.cn, i.en, (i.pain || []).join(' '), JSON.stringify(i.solution || ''), (i.materials ? JSON.stringify(i.materials) : '')].join(' ')
  }));
  d.materials.forEach(m => out.push({
    t: m.cn, s: `物料属性 · 莫氏 ${m.mohs} · 易磨性 ${m.grindability}`, u: `materials.html#${encodeURIComponent(m.cn)}`,
    txt: [m.cn, m.en, m.mohs, m.grindability, '密度 ' + m.density].join(' ')
  }));
  (d.decision.quick_answers || []).forEach(q => out.push({
    t: q.q, s: '选型问答', u: `decision.html#qa`, txt: [q.q, q.a].join(' ')
  }));
  out.forEach(o => o.txt = o.txt.toLowerCase());
  KB.idx = out;
}

function search(q) {
  const k = q.trim().toLowerCase();
  if (k.length < 1) return [];
  const terms = k.split(/\s+/);
  return KB.idx
    .map(o => {
      let sc = 0;
      terms.forEach(t => {
        if (o.t.toLowerCase().includes(t)) sc += 10;
        if (o.txt.includes(t)) sc += 3;
      });
      return { o, sc };
    })
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 14)
    .map(x => x.o);
}

function initSearch() {
  const inp = $('#q'); if (!inp) return;
  inp.addEventListener('input', () => {
    const box = $('#hits');
    const r = search(inp.value);
    if (!r.length) { box.classList.remove('on'); box.innerHTML = ''; return; }
    box.innerHTML = r.map(o => `<a href="${o.u}">${esc(o.t)}<small>${esc(o.s)}</small></a>`).join('');
    box.classList.add('on');
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const a = $('#hits a'); if (a) location.href = a.href; }
    if (e.key === 'Escape') $('#hits').classList.remove('on');
  });
}

/* ---------- 通用片段 ---------- */
const famName = id => KB.data.families.find(f => f.id === id)?.cn || id;
const prodById = id => KB.data.products.find(p => p.id === id);
const indById = id => KB.data.industries.find(i => i.id === id);
const rng = p => p.size_range ? `D50 ${p.size_range.d50_min}~${p.size_range.d50_max}μm` : '—';

function header(active) {
  const nav = [
    ['index.html', '总览'], ['path.html', '学习路径'], ['product-list.html', '产品库'],
    ['decision.html', '选型决策'], ['industry.html', '行业方案'],
    ['materials.html', '物料与目数'], ['glossary.html', '术语']
  ];
  // 气流分级轮的几何线稿：同心圆 + 叶片，用当前色描边
  const logo = `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="9.2" fill="none" stroke="currentColor" stroke-width="1.1"/>
    <circle cx="11" cy="11" r="4.2" fill="none" stroke="currentColor" stroke-width="1.1"/>
    ${[0,45,90,135].map(a=>{
      const r=a*Math.PI/180, x1=11+Math.cos(r)*4.2, y1=11+Math.sin(r)*4.2,
            x2=11+Math.cos(r)*9.2, y2=11+Math.sin(r)*9.2;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.1"/>`;
    }).join('')}
  </svg>`;
  return `<header class="top"><div class="top-in">
    <a class="brand" href="index.html" aria-label="ALPA 粉体选型知识库首页">${logo}<b>ALPA</b><span>粉体选型知识库</span></a>
    <nav class="menu" aria-label="主导航">${nav.map(([u, t], i) =>
      `<a href="${u}" class="${u === active ? 'on' : ''}${i > 2 ? ' more' : ''}">${t}</a>`).join('')}
      <details class="moremenu"><summary aria-label="更多导航">更多</summary>
        <div>${nav.slice(3).map(([u, t]) => `<a href="${u}">${t}</a>`).join('')}</div>
      </details></nav>
    <div class="searchbox">
      <input id="q" placeholder="搜索" aria-label="搜索产品、物料与问题" autocomplete="off">
      <div id="hits"></div>
    </div>
  </div></header>`;
}

/* ---------- 视图：总览 ---------- */
function viewIndex() {
  const d = KB.data;
  return `<main>
    <div class="lede">
      <h1>把「选什么设备、为什么」做成可以查的库</h1>
      <p>内容来自 2022 内部培训手册、2024 产品样册与中英文官网。每条选型边界都标了出处，不写没有出处的推断。
      目的不是背参数，而是客户说出物料和粒度的那一刻，你能立刻给出路线、机型和站得住的理由。</p>
    </div>

    <div class="stats">
      <div><b>${d.products.length}</b><small>产品系列，每个都写了边界与代价</small></div>
      <div><b>${d.industries.length}</b><small>行业方案，难点到答法逐条对应</small></div>
      <div><b>${d.materials.length}</b><small>物料密度、硬度与易磨性</small></div>
      <div><b>${d.decision.quick_answers.length}</b><small>客户问出口就能答的速答</small></div>
    </div>

    <h2>粒度决定路线</h2>
    <p>把客户的目标粒度放到这条轴上，路线就出来了。左边粗、右边细，四段之间不是渐变而是断档，因为断档处正是成本跃升的地方。</p>
    <figure class="figure">
      <svg viewBox="0 0 720 210" role="img" aria-label="粒度路线示意：20 到 300 目用机械粉碎，100 到 1500 目用空气分级磨，325 到 5000 目用气流粉碎，更细用蒸汽动能磨">
        <defs>
          <linearGradient id="gA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#B0470E" stop-opacity=".18"/>
            <stop offset="1" stop-color="#B0470E" stop-opacity=".34"/>
          </linearGradient>
          <linearGradient id="gB" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#8A6A2E" stop-opacity=".20"/>
            <stop offset="1" stop-color="#8A6A2E" stop-opacity=".38"/>
          </linearGradient>
          <linearGradient id="gC" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#1A4FA0" stop-opacity=".16"/>
            <stop offset="1" stop-color="#1A4FA0" stop-opacity=".32"/>
          </linearGradient>
          <linearGradient id="gD" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#15171A" stop-opacity=".10"/>
            <stop offset="1" stop-color="#15171A" stop-opacity=".26"/>
          </linearGradient>
        </defs>

        <!-- 四段色带 -->
        <rect x="20"  y="46" width="150" height="34" fill="url(#gA)"/>
        <rect x="178" y="46" width="150" height="34" fill="url(#gB)"/>
        <rect x="336" y="46" width="170" height="34" fill="url(#gC)"/>
        <rect x="514" y="46" width="150" height="34" fill="url(#gD)"/>

        <!-- 段标签 -->
        <text x="20"  y="36" class="fg-h">20 至 300 目</text>
        <text x="178" y="36" class="fg-h">100 至 1500 目</text>
        <text x="336" y="36" class="fg-h">325 至 5000 目</text>
        <text x="514" y="36" class="fg-h">更细，亚微米</text>

        <text x="20"  y="100" class="fg-b">针盘磨 / 锤式磨</text>
        <text x="178" y="100" class="fg-b">空气分级磨</text>
        <text x="336" y="100" class="fg-b">气流粉碎</text>
        <text x="514" y="100" class="fg-b">蒸汽动能磨</text>

        <text x="20"  y="120" class="fg-s">约 850 至 53 μm</text>
        <text x="178" y="120" class="fg-s">约 150 至 10 μm</text>
        <text x="336" y="120" class="fg-s">约 45 至 3 μm</text>
        <text x="514" y="120" class="fg-s">0.5 至 1 μm</text>

        <!-- 刻度轴 -->
        <line x1="20" y1="152" x2="664" y2="152" class="axis"/>
        <g class="tick">
          <line x1="20" y1="152" x2="20" y2="158"/><text x="20" y="176" text-anchor="middle">850 μm</text>
          <line x1="118" y1="152" x2="118" y2="158"/><text x="118" y="176" text-anchor="middle">150</text>
          <line x1="216" y1="152" x2="216" y2="158"/><text x="216" y="176" text-anchor="middle">53</text>
          <line x1="314" y1="152" x2="314" y2="158"/><text x="314" y="176" text-anchor="middle">45</text>
          <line x1="412" y1="152" x2="412" y2="158"/><text x="412" y="176" text-anchor="middle">10</text>
          <line x1="510" y1="152" x2="510" y2="158"/><text x="510" y="176" text-anchor="middle">3</text>
          <line x1="608" y1="152" x2="608" y2="158"/><text x="608" y="176" text-anchor="middle">0.5</text>
        </g>
        <text x="664" y="176" class="fg-s" text-anchor="end">μm</text>

        <!-- 能耗提示 -->
        <text x="20" y="200" class="fg-s">能耗基准 1×</text>
        <text x="336" y="200" class="fg-s">气流粉碎能耗约为机械粉碎的 2 至 3 倍</text>
        <text x="664" y="200" class="fg-s" text-anchor="end">最细</text>
      </svg>
      <figcaption>段与段之间的空白是真实的断档：机械磨做不到 10μm 以下稳定量产，气流磨做不到 45μm 以上还比机械磨便宜。</figcaption>
    </figure>

    <h2>产品谱系</h2>
    <p>所有设备只回答两个问题：把料<b>磨细</b>，还是把粉<b>切段</b>。磨细又分靠气流自撞与靠转子打；切段只有分级机一类。</p>
    <div class="tw"><table>
      <thead><tr><th>族</th><th>系列</th><th>粒度 D50</th><th>产能</th><th>定位</th></tr></thead>
      <tbody>${d.families.map(f => {
        const ps = d.products.filter(p => p.family === f.id);
        return ps.map((p, i) => `<tr>
          ${i === 0 ? `<td rowspan="${ps.length}"><b>${esc(f.cn)}</b><br><span class="sub">${ps.length} 个系列</span></td>` : ''}
          <td><a href="product.html?id=${p.id}">${esc(p.cn)}</a><br><span class="sub">${esc(p.cname)}</span></td>
          <td class="num">${p.size_range ? p.size_range.d50_min + '~' + p.size_range.d50_max : '—'} μm</td>
          <td class="num">${p.capacity_tph ? p.capacity_tph + ' t/h' : '—'}</td>
          <td>${esc((f.positioning || '').slice(0, 40))}${i === 0 ? '…' : ''}</td>
        </tr>`).join('');
      }).join('')}</tbody>
    </table></div>

    <h2>怎么用这个库</h2>
    <div class="track">
      <div class="step"><div class="no">01</div><div class="bd"><b>先走一遍学习路径</b>
        <span>六步，从「为什么分气流和机械」到「能对客户讲清楚」，约两小时，末尾三道自测题。</span></div></div>
      <div class="step"><div class="no">02</div><div class="bd"><b>遇到具体客户，查选型决策</b>
        <span>按粒度、硬度、水分、温度四条线，直接给出路线与理由。</span></div></div>
      <div class="step"><div class="no">03</div><div class="bd"><b>卡住时查物料表与目数换算</b>
        <span>客户说「200 目」，你得知道是 75μm；说「石英」，你得知道莫氏 7 不能上机械磨。</span></div></div>
    </div>

    <div class="note"><b>数据边界：</b>两份「机械粉碎样册」在上传时被截断为 25MB 而无法解析，
    机械磨系列细节以培训手册与官网为准。手册与官网口径冲突处（如分级转子线速度 80m/s 与 65m/s），两说并存并标注来源。</div>
  </main>`;
}

/* ---------- 视图：产品列表 ---------- */
function viewProductList() {
  const d = KB.data;
  return `<main>
    <div class="lede"><h1>产品库</h1>
      <p>${d.products.length} 个系列。每条给出粒度区间、产能口径与一句「它存在的理由」。</p></div>
    <div class="filterbar" id="famf">
      <button class="on" data-f="">全部</button>
      ${d.families.map(f => `<button data-f="${f.id}">${esc(f.cn)}</button>`).join('')}
    </div>
    <div class="plist" id="plist">
      ${d.products.map(p => `
        <a class="prow" href="product.html?id=${p.id}" data-fam="${p.family}">
          <div>
            <div class="nm">${esc(p.cn)}<em>${esc(p.en)}</em></div>
            <div class="meta">${esc(famName(p.family))}${(p.series || []).length ? ' · ' + p.series.map(esc).join(' / ') : ''}</div>
          </div>
          <div class="rng">${rng(p)}<small>${p.capacity_tph ? p.capacity_tph + ' t/h 单套' : ''}</small></div>
        </a>`).join('')}
    </div>
  </main>`;
}

function wireProductList() {
  $('#famf')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#famf').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const f = b.dataset.f;
    document.querySelectorAll('#plist .prow').forEach(r => {
      r.style.display = (!f || r.dataset.fam === f) ? '' : 'none';
    });
  });
}

/* ---------- 视图：产品详情 ---------- */
function viewProduct() {
  const id = new URLSearchParams(location.search).get('id');
  const p = prodById(id) || KB.data.products[0];
  const inds = (KB.data.index.prod_industries[p.id] || []).map(indById).filter(Boolean);
  const kv = [
    ['系列', (p.series || []).join(' · ')],
    ['粒度范围', `<code>${rng(p)}</code>${p.size_range?.d97 ? ` ｜ D97 <code>${esc(p.size_range.d97)}</code>` : ''}`],
    ['单套产能', p.capacity_tph ? `<code>${p.capacity_tph} t/h</code>（官网口径，随物料浮动）` : '—'],
    ['入料粒度', p.feed_size ? (typeof p.feed_size === 'string' ? esc(p.feed_size) : Object.entries(p.feed_size).map(([k, v]) => `${k} <code>${esc(v)}</code>`).join(' ｜ ')) : '—'],
    ['硬度上限', p.hardness_limit ? esc(p.hardness_limit) : '—'],
    p.moisture_limit ? ['水分上限', esc(p.moisture_limit)] : null,
    p.efficiency ? ['分级效率', esc(p.efficiency)] : null,
    p.temp_rise ? ['温升', esc(p.temp_rise)] : null,
    p.key_params ? ['关键工况', Object.entries(p.key_params).map(([k, v]) => `${k} <code>${v}</code>`).join(' ｜ ')] : null,
    ['所属族', `<a href="product-list.html">${esc(famName(p.family))}</a>`],
  ].filter(Boolean);

  return `<main>
    <div class="crumb"><a href="index.html">总览</a> / <a href="product-list.html">产品库</a> / ${esc(p.cn)}</div>
    <h1>${esc(p.cn)}</h1>
    <p class="sub">${esc(p.en)}</p>

    <h2>原理</h2>
    <p>${esc(p.principle)}</p>
    <figure class="figure flow">
      <svg viewBox="0 0 720 250" role="img" aria-label="设备工作流程示意：物料进入粉碎区被粉碎，上升气流带到分级区，细粉穿过分级轮被收集，粗粉回落继续粉碎">
        <!-- 主腔体 -->
        <path d="M150 60 h300 a14 14 0 0 1 14 14 v96 a14 14 0 0 1 -14 14 h-300 a14 14 0 0 1 -14 -14 v-96 a14 14 0 0 1 14 -14 z"
              fill="none" stroke="var(--ink)" stroke-width="1.4"/>
        <!-- 分级区 -->
        <line x1="150" y1="118" x2="450" y2="118" stroke="var(--rule)" stroke-width="1" stroke-dasharray="4 4"/>
        <!-- 分级轮 -->
        <g transform="translate(300 118)">
          <circle r="26" fill="none" stroke="var(--link)" stroke-width="1.4"/>
          <circle r="9" fill="none" stroke="var(--link)" stroke-width="1.2"/>
          <line x1="-26" y1="0" x2="26" y2="0" stroke="var(--link)" stroke-width="1"/>
          <line x1="0" y1="-26" x2="0" y2="26" stroke="var(--link)" stroke-width="1"/>
          <line x1="-18.4" y1="-18.4" x2="18.4" y2="18.4" stroke="var(--link)" stroke-width="1"/>
          <line x1="18.4" y1="-18.4" x2="-18.4" y2="18.4" stroke="var(--link)" stroke-width="1"/>
        </g>
        <!-- 喷嘴 -->
        <g stroke="var(--mark)" stroke-width="1.4" fill="none">
          <path d="M196 160 l22 -14"/><path d="M276 160 l22 -14"/><path d="M356 160 l22 -14"/>
        </g>
        <text x="205" y="185" class="fg-s" text-anchor="middle">喷嘴</text>
        <!-- 气流上升 -->
        <g stroke="var(--rule)" stroke-width="1" fill="none">
          <path d="M200 150 v-22" marker-end="url(#ar)"/><path d="M300 150 v-22" marker-end="url(#ar)"/><path d="M400 150 v-22" marker-end="url(#ar)"/>
        </g>
        <!-- 细粉出口 -->
        <path d="M450 100 h70" stroke="var(--ok)" stroke-width="1.4" marker-end="url(#arg)"/>
        <text x="470" y="90" class="fg-s">细粉 → 收集</text>
        <!-- 粗粉回落 -->
        <path d="M150 96 h-52 v46 h52" stroke="var(--ink-3)" stroke-width="1.2" fill="none" stroke-dasharray="5 4" marker-end="url(#arn)"/>
        <text x="86" y="120" class="fg-s" text-anchor="middle">粗粉回落</text>
        <!-- 进料 -->
        <path d="M300 26 v22" stroke="var(--ink)" stroke-width="1.2" marker-end="url(#ar)"/>
        <text x="300" y="20" class="fg-s" text-anchor="middle">进料</text>
        <text x="150" y="60" class="fg-s">① 粉碎区</text>
        <text x="150" y="112" class="fg-s">② 分级区</text>
        <text x="300" y="142" class="fg-s" text-anchor="middle">分级轮转速决定切割粒径</text>
        <defs>
          <marker id="ar" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="var(--rule)" stroke-width="1.2"/></marker>
          <marker id="arg" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="var(--ok)" stroke-width="1.2"/></marker>
          <marker id="arn" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L6 3.5 L0 7" fill="none" stroke="var(--ink-3)" stroke-width="1.2"/></marker>
        </defs>
      </svg>
      <figcaption>台账上看到的三个数字都能在这张图里找到位置：粉碎区决定产能，分级轮转速决定粒度，粗粉回落的路径决定能耗。</figcaption>
    </figure>


    <h2>关键参数</h2>
    <div class="kv">${kv.map(([k, v]) => `<div class="r"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join('')}</div>

    ${p.features?.length ? `<h2>设计特点</h2>
      <ul class="tight">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}

    ${p.constraints?.length ? `<h2>边界与代价</h2>
      <p>这一节比特点更重要。客户最后不选它，往往是因为这里某一条。</p>
      <ul class="tight">${p.constraints.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}

    ${p.applications?.length ? `<h2>适用物料与行业</h2>
      <div>${p.applications.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>
      ${inds.length ? `<p style="margin-top:12px">对应行业方案：${inds.map(i => `<a href="industry.html?id=${i.id}">${esc(i.cn)}</a>`).join('、')}</p>` : ''}
      ${p.materials ? `<h3>具体材料清单</h3>${Object.entries(p.materials).map(([k, v]) =>
        `<div style="margin-bottom:10px"><span class="sub">${k === 'cathode' ? '正极' : k === 'anode' ? '负极' : esc(k)}</span><br>${v.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`).join('')}` : ''}
    ` : ''}

    ${p.case ? `<h2>落地案例</h2><p>${esc(p.case)}</p>` : ''}

    ${p.learn_why ? `<div class="why"><b>学习要点 · 为什么它存在</b><p>${esc(p.learn_why)}</p></div>` : ''}

    <h2>出处</h2>
    <div class="chip-list">${(p.source || []).map(s => `<span class="chip">${esc(
      String(s).replace('manual', '培训手册').replace('web_cn', '官网中文').replace('web_en', '官网英文'))}</span>`).join('')}</div>
    ${p.en_page && p.en_page !== '/' ? `<p style="margin-top:12px"><a href="https://www.alpapowder.com/machines/${p.en_page}/">官网英文页 ↗</a></p>` : ''}
  </main>`;
}

/* ---------- 视图：选型决策 ---------- */
function viewDecision() {
  const d = KB.data.decision;
  const pw = id => { const p = prodById(id); return p ? `<a href="product.html?id=${p.id}" class="chip acc">${esc(p.cn)}</a>` : ''; };

  return `<main>
    <div class="lede"><h1>选型决策</h1>
      <p>这一页是全库的核心。顺序很重要：<b style="color:var(--ink)">先看粒度定路线，再看物料属性做否决，最后看同族横向差异</b>。
      不要反过来。</p></div>

    <h2>一 · 粒度定路线</h2>
    <p>手册原文的划分口径。核心逻辑只有一句：<b style="color:var(--ink)">能用机械磨就不用气流磨</b>，
    因为同物料同粒度下气流磨能耗是机械磨的 2~3 倍。</p>
    <div class="dec">
      <div class="q">目标粒度 → 路线</div>
      ${d.size_routes.map(r => `<div class="a">
        <div class="cond">${esc(r.mesh)}</div>
        <div class="res"><b>${esc(r.route)}</b> ${r.products.map(pw).join(' ')}
          <span class="why-t" style="display:block;margin-top:3px">${esc(r.um)}</span>
          <span class="why-t">${esc(r.reason)}</span></div>
      </div>`).join('')}
    </div>

    <h2>二 · 物料属性做否决</h2>
    <p>粒度告诉你去哪条路，物料属性负责把不成立的路砍掉。下面每一条都能直接否掉机械磨。</p>
    <div class="tw"><table>
      <thead><tr><th style="width:120px">属性</th><th style="width:240px">判定</th><th>怎么处理</th></tr></thead>
      <tbody>${d.material_gates.map(g => `<tr>
        <td><b>${esc(g.attr)}</b></td>
        <td>${esc(g.mechanical_limit || '')}${g.jet_limit ? `<br><span class="sub">气流磨：${esc(g.jet_limit)}</span>` : ''}</td>
        <td>${esc(g.solution || g.detail || '')}</td>
      </tr>`).join('')}</tbody>
    </table></div>

    <h3>硬度的三条线</h3>
    <div class="dec">
      <div class="q">莫氏硬度</div>
      ${(d.material_gates.find(g => g.attr === '莫氏硬度')?.detail || []).map(x => `<div class="a">
        <div class="cond">${esc(x.range)}</div><div class="res"><b>${esc(x.route)}</b></div></div>`).join('')}
    </div>

    <h2>三 · 同族横向差异</h2>
    <p>客户已经锁定大类了，剩下的是「这几种里选哪个」。这是最容易答不上来的地方。</p>
    ${d.family_choice.map(f => `<div class="dec">
      <div class="q">${esc(f.question)}</div>
      <div class="a" style="grid-template-columns:1fr"><div class="res">
        <b>${esc(f.answer)}</b>
        <span class="sub" style="display:block;margin-top:6px">出处：${esc(String(f.source).replace('FAQ', '手册 FAQ ').replace('§', '手册 §'))}</span>
      </div></div>
    </div>`).join('')}

    <h2>四 · 口径陷阱</h2>
    <p>选型返工多半不是技术问题，是「客户说的粒度和你理解的不一样」。</p>
    <ul class="tight">${d.caveats.items.map(c => `<li>${esc(c)}</li>`).join('')}</ul>

    <h2>五 · 接单必问清单</h2>
    ${d.intake_checklist.items.map(g => `<h3>${esc(g.group)}</h3>
      <div>${g.items.map(i => `<span class="chip">${esc(i)}</span>`).join('')}</div>`).join('')}

    <h2>六 · 商务要素</h2>
    <div class="kv">
      <div class="r"><div class="k">货期</div><div class="v">${esc(d.commercial.lead_time)}</div></div>
      <div class="r"><div class="k">付款</div><div class="v">${esc(d.commercial.payment)}</div></div>
      <div class="r"><div class="k">质保</div><div class="v">${esc(d.commercial.warranty)}</div></div>
      <div class="r"><div class="k">供货范围</div><div class="v">${esc(d.commercial.scope)}</div></div>
    </div>
    <h3>易损件与寿命</h3>
    <ul class="tight">${d.commercial.wear_parts.map(w => `<li>${esc(w)}</li>`).join('')}</ul>

    <h2 id="qa">七 · 常见需求速答</h2>
    <p>客户问出口就能答的那几句。</p>
    ${d.quick_answers.map(q => `<div class="dec">
      <div class="q">${esc(q.q)}</div>
      <div class="a" style="grid-template-columns:1fr"><div class="res">${esc(q.a)}
        <span class="sub" style="display:block;margin-top:4px">出处：手册 FAQ ${esc(String(q.src).replace('FAQ', '').replace(/\//g, ' / '))}</span></div></div>
    </div>`).join('')}
  </main>`;
}

/* ---------- 视图：行业 ---------- */
function viewIndustryList() {
  const d = KB.data;
  return `<main>
    <div class="lede"><h1>行业方案</h1>
      <p>${d.industries.length} 个行业。每页的结构都是「客户的难处 → 公司的答法 → 用什么设备」。
      这个顺序就是跟客户谈话的顺序。</p></div>
    <div class="plist">
      ${d.industries.map(i => `<a class="prow" href="industry.html?id=${i.id}">
        <div><div class="nm">${esc(i.cn)}<em>${esc(i.en)}</em></div>
          <div class="meta">${i.share ? esc(i.share) : (i.pain || []).length + ' 个典型痛点'}</div>
          <div style="margin-top:7px">${(i.products || []).map(p => { const x = prodById(p); return x ? `<span class="chip">${esc(x.cn)}</span>` : ''; }).join('')}</div>
        </div>
        <div class="rng">${(i.pain || []).length} 痛点</div>
      </a>`).join('')}
    </div>
  </main>`;
}

function viewIndustry() {
  const id = new URLSearchParams(location.search).get('id');
  const i = indById(id) || KB.data.industries[0];
  const plist = (i.products || []).map(prodById).filter(Boolean);
  return `<main>
    <div class="crumb"><a href="index.html">总览</a> / <a href="industry.html">行业方案</a> / ${esc(i.cn)}</div>
    <h1>${esc(i.cn)}</h1>
    <p class="sub">${esc(i.en)}${i.share ? ` · ${esc(i.share)}` : ''}</p>

    <h2>客户在愁什么</h2>
    <ul class="tight">${(i.pain || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>

    <h2>公司的答法</h2>
    ${i.solution ? `<ul class="tight">${[].concat(i.solution).map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${i.tech_edge ? `<h3>技术差异点</h3><ul class="tight">${i.tech_edge.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${i.three_routes ? `<h3>三条技术路线怎么分工</h3>
      <div class="tw"><table><thead><tr><th>路线</th><th>典型指标</th><th>适合矿物</th><th>为什么</th></tr></thead>
      <tbody>${i.three_routes.map(r => `<tr><td>${esc(r.route)}</td><td class="num">${esc(r.example)}</td>
        <td>${esc(r.fit)}</td><td style="color:var(--ink-2)">${esc(r.why)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${i.solutions_by_problem ? `<h3>按物料特性对症</h3>
      <div class="tw"><table><thead><tr><th>问题</th><th>做法</th></tr></thead>
      <tbody>${i.solutions_by_problem.map(s => `<tr><td><b style="color:var(--ink)">${esc(s.problem)}</b></td>
        <td style="color:var(--ink-2)">${esc(s.approach)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${i.detail ? `<h3>四个支柱</h3><ul class="tight">${Object.entries(i.detail).map(([k, v]) => `<li><strong>${esc(k)}</strong>：${esc(v)}</li>`).join('')}</ul>` : ''}
    ${i.pillars ? `<p>${i.pillars.join(' · ')}</p>` : ''}
    ${i.tech ? `<h3>专长技术</h3><div class="chip-list">${i.tech.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${i.materials ? `<h3>具体材料</h3>${Object.entries(i.materials).map(([k, v]) => `<div style="margin-bottom:10px">
      <span class="sub">${k === 'cathode' ? '正极' : k === 'anode' ? '负极' : esc(k)}</span><br>
      ${v.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`).join('')}` : ''}
    ${i.chem ? `<h3>反应原理</h3><p class="mono" style="font-size:13px;color:var(--ink-2)">${esc(i.chem)}</p>` : ''}
    ${i.special ? `<div class="note"><b>专机：</b>${esc(i.special)}</div>` : ''}

    <h2>用哪些设备</h2>
    <div class="chip-list">${plist.map(p => `<a href="product.html?id=${p.id}" class="chip">${esc(p.cn)}</a>`).join('')}</div>

    <h2>出处</h2>
    <div class="chip-list">${[].concat(i.source || []).map(s => `<span class="chip">${esc(String(s).replace('manual', '培训手册'))}</span>`).join('')}</div>
    ${i.web ? `<p style="margin-top:12px"><a href="https://www.alpapowder.cn/applications/${i.web}.html">官网行业页 ↗</a></p>` : ''}
  </main>`;
}

/* ---------- 视图：物料与目数 ---------- */
function viewMaterials() {
  const d = KB.data;
  return `<main>
    <div class="lede"><h1>物料与目数</h1>
      <p>两块最常被问倒的常识：<b style="color:var(--ink)">这个料有多硬</b>，和<b style="color:var(--ink)">客户说的「目」是多少微米</b>。</p></div>

    <h2>目数 ↔ 微米</h2>
    <p>粗估公式：<span class="mono" style="color:var(--accent)">目数 × 孔径(μm) ≈ 15000</span>。
    例：400 目 ≈ 38μm，500 目 ≈ 30μm。定精确值要查表，因为中美英日标准不同，中国采用美国标准。</p>
    <div class="tw"><table>
      <thead><tr><th>孔径 μm</th><th>美国标准</th><th>泰勒标准</th><th>英国标准</th></tr></thead>
      <tbody>${d.mesh.slice().reverse().map(m => `<tr><td class="num">${m.um}</td>
        <td class="num">${m.us ?? '—'}</td><td class="num">${m.tyler ?? '—'}</td><td class="num">${m.uk ?? '—'}</td></tr>`).join('')}</tbody>
    </table></div>

    <h2>常见物料硬度与易磨性</h2>
    <p>莫氏硬度 <b style="color:var(--warn)">5 是机械磨的分界线</b>，超过就只能走气流路线。
    易磨性 1 最好磨、3 最难磨。密度与硬度共同决定产能折算。</p>
    <div class="filterbar" id="mf">
      <button class="on" data-r="">全部 ${d.materials.length}</button>
      <button data-r="mechanical+jet">机械磨可做 ${d.materials.filter(m => m.route === 'mechanical+jet').length}</button>
      <button data-r="jet-only">只能气流磨 ${d.materials.filter(m => m.route === 'jet-only').length}</button>
    </div>
    <div class="tw"><table>
      <thead><tr><th>物料</th><th>English</th><th>密度 g/cm³</th><th>莫氏硬度</th><th>易磨性</th><th>路线</th></tr></thead>
      <tbody id="mtb">${d.materials.map(m => `<tr data-r="${m.route}" id="${esc(m.cn)}">
        <td><b style="color:var(--ink)">${esc(m.cn)}</b></td><td style="color:var(--ink-3)">${esc(m.en)}</td>
        <td class="num">${esc(m.density)}</td><td class="num">${esc(m.mohs)}</td><td class="num">${esc(m.grindability)}</td>
        <td>${m.route === 'jet-only' ? '<span class="chip stop">只能气流磨</span>' : '<span class="chip ok">机械磨可</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="note">此表为手册「常见物料的硬度与易磨性统计」，原文标注<b>仅供参考</b>。
    实际产能还与粒度、水分、流动性相关，报价前仍需实验。</div>
  </main>`;
}

function wireMaterials() {
  $('#mf')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#mf').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const r = b.dataset.r;
    document.querySelectorAll('#mtb tr').forEach(tr => tr.style.display = (!r || tr.dataset.r === r) ? '' : 'none');
  });
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    el?.scrollIntoView?.();
  }
}

/* ---------- 视图：学习路径 ---------- */
function viewPath() {
  const steps = [
    ['分清两条路', '先建立唯一的判断起点：气流磨与机械磨不是「好坏」关系，是「粒度/纯度」与「能耗」的交换。读：产品谱系 + 选型决策第一节。',
      [['index.html', '产品谱系'], ['decision.html', '粒度定路线']]],
    ['把粒度换成人话', '客户说目、说微米、说 D50/D97，你得能在三种说法之间换算，并识别「通过率没说清」这类陷阱。读：物料与目数 + 口径陷阱。',
      [['materials.html', '目数换算'], ['decision.html#qa', '口径陷阱']]],
    ['吃透四个主力机型', '流化床气流磨 MQW、圆盘式气流磨 MQP、空气分级磨 CSM、气流分级机。这四个覆盖了八成真实需求，每一个都要能说出适用与不适用各三条。',
      [['product.html?id=mqw', 'MQW'], ['product.html?id=mqp', 'MQP'], ['product.html?id=csm', 'CSM'], ['product.html?id=classifier', '分级机']]],
    ['认识三个特殊答案', '蒸汽磨解决亚微米，针盘磨解决 20~300 目的大产能，蜂巢磨解决高含水＋改性。这三个是「客户以为做不到」的场景。',
      [['product.html?id=steam-jet', '蒸汽动能磨'], ['product.html?id=cum-p', '针盘磨'], ['product.html?id=ulm-g', '蜂巢磨']]],
    ['按行业串联', '把设备放回行业语境。重点看电池材料（市占 80%）与医药（市占 50%）两页，这两页的指标最硬，也最容易在客户面前讲。',
      [['industry.html?id=battery', '电池材料'], ['industry.html?id=pharma', '医药'], ['industry.html?id=nonmetal', '非金属矿']]],
    ['能对客户讲', '最后一步是输出。用接单必问清单练习：给一个虚构物料，走完「问什么 → 定路线 → 选机型 → 说理由」四步，再对照常见需求速答检查自己的回答。',
      [['decision.html', '接单必问清单'], ['decision.html#qa', '速答']]],
  ];
  return `<main>
    <div class="lede"><h1>学习路径</h1>
      <p>六步，从零到能在客户面前开口。每一步都落到具体页面，不空谈。</p></div>
    <div class="track">
      ${steps.map(([t, d, links], n) => `<div class="step">
        <div class="no">${String(n + 1).padStart(2, '0')}</div>
        <div class="bd"><b>${esc(t)}</b><span>${esc(d)}</span>
          <div style="margin-top:8px">${links.map(([u, x]) => `<a href="${u}" class="chip acc">${esc(x)}</a>`).join('')}</div>
        </div></div>`).join('')}
    </div>

    <h2>三个自测题</h2>
    <p>能答上来，说明这一轮过关；答不上，回到对应章节。</p>
    <div class="dec"><div class="q">问题 1</div><div class="a" style="grid-template-columns:1fr"><div class="res">
      客户要粉碎石英，目标 D97 45μm，能不能用空气分级磨？为什么？<br>
      <span class="sub">提示：查石英的莫氏硬度，再看机械磨的分界线。</span></div></div></div>
    <div class="dec"><div class="q">问题 2</div><div class="a" style="grid-template-columns:1fr"><div class="res">
      客户要 D50 1μm 的磷酸铁锂。你手上四个主力机型哪个都做不到，下一步是什么？<br>
      <span class="sub">提示：压缩空气的粒度极限是多少？还有什么介质？</span></div></div></div>
    <div class="dec"><div class="q">问题 3</div><div class="a" style="grid-template-columns:1fr"><div class="res">
      客户说「我只要把现在的粉切掉粗头，不想再磨」。你推荐粉碎机还是分级机？<br>
      <span class="sub">提示：分级机本身不改变粒径。</span></div></div></div>
  </main>`;
}

/* ---------- 视图：术语 ---------- */
function viewGlossary() {
  const terms = [
    ['D50', '中位径，累计分布 50% 处的粒径。客户说「平均粒径」多半指它。'],
    ['D97', '累计分布 97% 处粒径，即 97% 的颗粒小于该值。碳酸钙常用此口径。'],
    ['D90 / D95', '同上逻辑。西药常用 D90，石英粉常用 D90~D95。'],
    ['Dmax', '最大粒径，也叫顶点切割。对粒度分布上端要求苛刻时用它。'],
    ['目（Mesh）', '每平方英寸孔数，目数越大孔径越小。粗略关系：目数 × 孔径(μm) ≈ 15000。'],
    ['莫氏硬度', '1~10 级的相对硬度。5 级是机械粉碎的实用分界线。'],
    ['易磨性', '手册中的 1~3 分级，1 最易磨、3 最难磨，直接影响产能折算。'],
    ['堆密度 / 真密度', '前者含颗粒间空隙，后者是材料本身密度。选型都问。'],
    ['分级轮 / 转子', '高速旋转产生离心力，把粗细颗粒分开的部件。转速决定切割粒径。'],
    ['线速度', '分级轮叶片外缘的线速度，单位 m/s。决定切割精度与细度上限的一级参数。'],
    ['拉瓦尔喷嘴', '把压缩空气加速到超音速的收缩-扩张喷嘴。气流磨的能量入口。'],
    ['自磨', '物料靠自身相互碰撞粉碎，不与金属研磨介质接触，因此磨损小、纯度高。'],
    ['分级效率（提取率）', '分级机把目标粒级的粉提取出来的比例，一般 60%~90%，受流动性与密度影响。'],
    ['闭路循环', '带分级机的磨机把粗粉送回再磨，形成循环。粒度由分级机而非磨机决定。'],
    ['惰性气体循环 / 氮气保护', '用氮气等惰性气体封闭循环，控制氧含量与水分，用于易燃易爆或易吸潮物料。'],
    ['CIP / SIP', '在线清洗 / 在线灭菌。医药与食品行业的硬性要求。'],
    ['DQ/IQ/OQ/PQ', '设计/安装/运行/性能确认，医药验证的四份文件。'],
    ['EPC', '设计、采购、施工总承包，即交钥匙工程。'],
    ['EP / PP / PVC 等', '文中出现的聚合物缩写，常作为热敏、易起静电的代表物料。'],
    ['PPB / PPM', '十亿分之一 / 百万分之一。电池材料用 PPB 表述磁性异物摄入量，机械磨用 PPM 表述金属增量。'],
  ];
  return `<main>
    <div class="lede"><h1>术语</h1>
      <p>这些词在手册与客户对话里反复出现。看不懂 D97，后面全是空的。</p></div>
    <div class="kv">${terms.map(([t, d]) => `<div class="r"><div class="k">${esc(t)}</div><div class="v">${esc(d)}</div></div>`).join('')}</div>
    <div class="note">术语解释为通用粉体工程定义，与手册用法一致；涉及公司口径的以 <a href="decision.html">选型决策</a> 页为准。</div>
  </main>`;
}

/* ---------- 路由 ---------- */
const VIEWS = {
  index: [viewIndex, null], 'product-list': [viewProductList, wireProductList],
  product: [viewProduct, null], decision: [viewDecision, null],
  industry: [viewIndustry, null], materials: [viewMaterials, wireMaterials],
  path: [viewPath, null], glossary: [viewGlossary, null],
};

function render() {
  const file = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const key = (file === 'industry' && !new URLSearchParams(location.search).get('id')) ? 'industry-list' : file;
  const view = key === 'industry-list' ? viewIndustryList : (VIEWS[key]?.[0] || viewIndex);
  const active = key.startsWith('product') ? 'product-list.html' : key + '.html';
  document.getElementById('app').innerHTML = header(active) + view() + footer();
  initSearch();
  const w = key === 'industry-list' ? null : VIEWS[key]?.[1];
  w?.();
  if (key === 'decision' && location.hash === '#qa') {
    setTimeout(() => document.getElementById('qa')?.scrollIntoView?.(), 60);
  }
}

function footer() {
  return `<footer>
    <div>ALPA 粉体选型知识库 · 内容来自 2022 内部培训手册、2024 产品样册与 <a href="https://www.alpapowder.cn">中文官网</a> /
    <a href="https://www.alpapowder.com">英文官网</a>。</div>
    <div style="margin-top:6px">参数随物料与工艺而变，报价前以工程师实验数据为准。本库仅作学习与内部参考。</div>
  </footer>`;
}

boot();