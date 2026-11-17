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
  return `<header class="top"><div class="top-in">
    <a class="brand" href="index.html"><b>ALPA</b><span>粉体选型知识库</span></a>
    <nav class="menu">${nav.map(([u, t]) =>
      `<a href="${u}" class="${u === active ? 'on' : ''}">${t}</a>`).join('')}</nav>
    <div class="searchbox">
      <input id="q" placeholder="搜产品 / 物料 / 问题" autocomplete="off">
      <div id="hits"></div>
    </div>
  </div></header>`;
}

/* ---------- 视图：总览 ---------- */
function viewIndex() {
  const d = KB.data;
  const byFam = d.families.map(f => ({
    f, ps: d.products.filter(p => p.family === f.id)
  }));
  return `<main>
    <div class="lede">
      <h1>把「选什么设备、为什么」这件事，做成可以查的库</h1>
      <p>全部内容来自 2022 内部培训手册、2024 版产品样册与中英文官网。每一条选型边界都标了出处，
      不写没有出处的推断。目的不是背参数，而是让你在客户说出物料和粒度的那一刻，
      能立刻给出路线、机型和一个站得住的理由。</p>
    </div>

    <div class="stats">
      <div><b>${d.products.length}</b><small>产品系列</small></div>
      <div><b>${d.industries.length}</b><small>行业方案</small></div>
      <div><b>${d.materials.length}</b><small>物料属性</small></div>
      <div><b>${d.decision.quick_answers.length}</b><small>选型问答</small></div>
      <div><b>${d.decision.size_routes.length}</b><small>条粒度路线</small></div>
    </div>

    <h2>一张图看懂产品谱系</h2>
    <p>公司所有设备最终只回答两个问题：<b style="color:var(--ink)">把料磨细</b>，还是<b style="color:var(--ink)">把粉切段</b>。
    磨细又分「靠气流自撞」与「靠转子打」，切段只有分级机一类。下面按这个逻辑分组。</p>
    ${byFam.map(({ f, ps }) => `
      <div class="dec">
        <div class="q">${esc(f.cn)} · ${esc(f.en)}</div>
        <div class="a" style="grid-template-columns:1fr">
          <div class="res" style="padding:14px 16px">
            <div style="margin-bottom:10px;color:var(--ink-2);font-size:13px">${esc(f.positioning)}</div>
            ${ps.map(p => `<a href="product.html?id=${p.id}" style="display:flex;justify-content:space-between;gap:12px;
              padding:8px 0;border-top:1px solid var(--line)">
              <span>${esc(p.cn)}<span class="sub" style="margin-left:8px">${esc(p.cname)}</span></span>
              <span class="mono" style="color:var(--accent);font-size:12px">${rng(p)}</span></a>`).join('')}
          </div>
        </div>
      </div>`).join('')}

    <h2>这个库怎么用</h2>
    <div class="track">
      <div class="step"><div class="no">01</div><div class="bd"><b>先走一遍学习路径</b>
        <span>六步，从「为什么分气流和机械」到「能对客户讲清楚」。约两小时。</span></div></div>
      <div class="step"><div class="no">02</div><div class="bd"><b>遇到具体客户，直接查选型决策</b>
        <span>按粒度、硬度、水分、温度四条线，给出路线与理由。</span></div></div>
      <div class="step"><div class="no">03</div><div class="bd"><b>卡住时查物料表与目数换算</b>
        <span>客户说「200 目」，你得知道是 75μm；说「石英」，你得知道莫氏 7 不能上机械磨。</span></div></div>
    </div>

    <div class="note"><b>关于数据边界：</b>本库只收录公开与内部培训资料里的信息。
    两份「机械粉碎样册」在上传时被截断为 25MB 而无法解析，故机械磨系列的细节以培训手册与官网为准；
    凡手册与官网口径冲突处（如分级转子线速度 80m/s 与 65m/s），两说并存并标注来源。</div>
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
            <div class="meta">${esc(p.cname)} · ${esc(famName(p.family))}</div>
            <div style="margin-top:7px">${(p.series || []).slice(0, 4).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          </div>
          <div class="rng">${rng(p)}</div>
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

    <h2>关键参数</h2>
    <div class="kv">${kv.map(([k, v]) => `<div class="r"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join('')}</div>

    ${p.features?.length ? `<h2>设计特点</h2>
      <ul class="tight">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}

    ${p.constraints?.length ? `<h2>边界与代价</h2>
      <p>这一节比特点更重要。客户最后不选它，往往是因为这里某一条。</p>
      <ul class="tight">${p.constraints.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}

    ${p.applications?.length ? `<h2>适用物料与行业</h2>
      <div>${p.applications.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>
      ${inds.length ? `<p style="margin-top:12px">对应行业方案：${inds.map(i => `<a href="industry.html?id=${i.id}" class="chip acc">${esc(i.cn)}</a>`).join(' ')}</p>` : ''}
      ${p.materials ? `<h3>具体材料清单</h3>${Object.entries(p.materials).map(([k, v]) =>
        `<div style="margin-bottom:10px"><span class="sub">${k === 'cathode' ? '正极' : k === 'anode' ? '负极' : esc(k)}</span><br>${v.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`).join('')}` : ''}
    ` : ''}

    ${p.case ? `<h2>落地案例</h2><p>${esc(p.case)}</p>` : ''}

    ${p.learn_why ? `<div class="why"><b>学习要点 · 为什么它存在</b><p>${esc(p.learn_why)}</p></div>` : ''}

    <h2>出处</h2>
    <div>${(p.source || []).map(s => `<span class="chip">${esc(
      String(s).replace('manual', '培训手册').replace('web_cn', '官网中文').replace('web_en', '官网英文'))}</span>`).join('')}</div>
    ${p.en_page && p.en_page !== '/' ? `<p style="margin-top:12px"><a href="https://www.alpapowder.com/machines/${p.en_page}/" target="_blank" rel="noopener">官网英文页 ↗</a></p>` : ''}
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
          <span class="sub" style="display:block;margin-top:2px">约 ${esc(r.um)}</span>
          <span class="why-t">${esc(r.reason)}</span></div>
      </div>`).join('')}
    </div>

    <h2>二 · 物料属性做否决</h2>
    <p>粒度告诉你去哪条路，物料属性负责把不成立的路砍掉。下面每一条都能直接否掉机械磨。</p>
    <div class="tw"><table>
      <thead><tr><th>属性</th><th>判定</th><th>为什么</th></tr></thead>
      <tbody>${d.material_gates.map(g => `<tr>
        <td><b style="color:var(--ink)">${esc(g.attr)}</b></td>
        <td>${esc(g.mechanical_limit || g.detail)}${g.jet_limit ? `<br><span class="sub">气流磨：${esc(g.jet_limit)}</span>` : ''}</td>
        <td style="color:var(--ink-2)">${esc(g.solution || (g.detail && g.mechanical_limit ? g.detail : ''))}
          ${g.detail && g.type === 'array' ? '' : ''}</td>
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
    ${i.pillars ? `<p>${i.pillars.map(p => `<span class="chip acc">${esc(p)}</span>`).join('')}</p>` : ''}
    ${i.tech ? `<h3>专长技术</h3><div>${i.tech.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
    ${i.materials ? `<h3>具体材料</h3>${Object.entries(i.materials).map(([k, v]) => `<div style="margin-bottom:10px">
      <span class="sub">${k === 'cathode' ? '正极' : k === 'anode' ? '负极' : esc(k)}</span><br>
      ${v.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`).join('')}` : ''}
    ${i.chem ? `<h3>反应原理</h3><p class="mono" style="font-size:13px;color:var(--ink-2)">${esc(i.chem)}</p>` : ''}
    ${i.special ? `<div class="note"><b>专机：</b>${esc(i.special)}</div>` : ''}

    <h2>用哪些设备</h2>
    <div>${plist.map(p => `<a href="product.html?id=${p.id}" class="chip acc">${esc(p.cn)} · ${rng(p)}</a>`).join(' ')}</div>

    <h2>出处</h2>
    <div>${[].concat(i.source || []).map(s => `<span class="chip">${esc(String(s).replace('manual', '培训手册'))}</span>`).join('')}</div>
    ${i.web ? `<p style="margin-top:12px"><a href="https://www.alpapowder.cn/applications/${i.web}.html" target="_blank" rel="noopener">官网行业页 ↗</a></p>` : ''}
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
    <div>ALPA 粉体选型知识库 · 内容来自 2022 内部培训手册、2024 产品样册与 <a href="https://www.alpapowder.cn" target="_blank" rel="noopener">中文官网</a> /
    <a href="https://www.alpapowder.com" target="_blank" rel="noopener">英文官网</a>。</div>
    <div style="margin-top:6px">参数随物料与工艺而变，报价前以工程师实验数据为准。本库仅作学习与内部参考。</div>
  </footer>`;
}

boot();