/* 设备剖面示意图生成器
   底纹来自生图模型（已裁掉水印），结构线由精确坐标绘制。
   每台设备一个独立的 draw 函数，不共用同一张图。
   输出：site/img/cutaway-<id>.svg
*/
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'site', 'img');
fs.mkdirSync(OUT, { recursive: true });

// 统一画幅与配色（与站点 token 对齐）
const C = {
  ink: '#15171A', line: '#8B9098', soft: '#C9CCC7',
  accent: '#B0470E', blue: '#1A4FA0', ok: '#1F6B43',
  paper: '#FBFBF9',
};
const W = 860, H = 470;

const defs = (id) => `
  <defs>
    <pattern id="tex-${id}" patternUnits="userSpaceOnUse" width="880" height="705">
      <image href="tex-steel.jpg" width="880" height="705" preserveAspectRatio="xMidYMid slice"/>
    </pattern>
    <linearGradient id="steel-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ECEDEA"/>
      <stop offset=".18" stop-color="#F7F8F5"/>
      <stop offset=".55" stop-color="#EEEFF0"/>
      <stop offset="1" stop-color="#DDDFE1"/>
    </linearGradient>
    <marker id="ar-${id}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
      <path d="M0 0 L6 3.5 L0 7" fill="none" stroke="${C.ink}" stroke-width="1.1"/>
    </marker>
    <marker id="arb-${id}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
      <path d="M0 0 L6 3.5 L0 7" fill="none" stroke="${C.blue}" stroke-width="1.1"/>
    </marker>
    <marker id="arg-${id}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
      <path d="M0 0 L6 3.5 L0 7" fill="none" stroke="${C.ok}" stroke-width="1.1"/>
    </marker>
  </defs>`;

// 对称腔体：给定中心、半宽、顶、腰、底宽，左右严格镜像
function vessel(id, {cx, top, waist, bottom, halfW, halfBottom, radius = 10}) {
  const l = cx - halfW, r = cx + halfW;      // 上口左右
  const lb = cx - halfBottom, rb = cx + halfBottom; // 下口左右
  // 从左圆角起点开始，保证左右边界严格为 l 与 r
  const d = [
    `M${l} ${top + radius}`,
    `a${radius} ${radius} 0 0 1 ${radius} ${-radius}`,      // 左上圆角
    `H${r - radius}`,
    `a${radius} ${radius} 0 0 1 ${radius} ${radius}`,       // 右上圆角
    `V${waist}`,                                             // 右侧直壁
    `L${rb} ${bottom}`,                                      // 右斜边
    `H${lb}`,                                                // 底边
    `L${l} ${waist}`,                                        // 左斜边
    'z',
  ].join(' ');
  return d;
}

// 通用：带钢质填充的腔体
const shell = (id, d, extra = '') =>
  `<g>
     <path d="${d}" fill="url(#steel-${id})" stroke="none"/>
     <path d="${d}" fill="url(#tex-${id})" opacity=".32" stroke="none"/>
     <path d="${d}" fill="none" stroke="${C.ink}" stroke-width="1.6" ${extra}/>
   </g>`;

/* ============ MQW 流化床式气流磨 ============ */
function mqw(id) {
  const cx = 330;
  return `
  <!-- 腔体：上圆筒 + 下锥斗 -->
  ${shell(id, vessel(id, {cx, top: 96, waist: 256, bottom: 340, halfW: 128, halfBottom: 54}))}
  <!-- 出料口 -->
  <rect x="${cx - 34}" y="340" width="68" height="26" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <rect x="${cx - 52}" y="366" width="104" height="12" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.2"/>
  <!-- 进料口 -->
  <rect x="${cx - 26}" y="58" width="52" height="38" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <line x1="${cx}" y1="20" x2="${cx}" y2="58" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>

  <!-- 法兰与内壁 -->
  <line x1="${cx - 128}" y1="106" x2="${cx + 128}" y2="106" stroke="${C.line}" stroke-width="1.2"/>
  <line x1="${cx - 128}" y1="256" x2="${cx + 128}" y2="256" stroke="${C.line}" stroke-width="1.2"/>
  <!-- 分级区虚线 -->
  <line x1="${cx - 118}" y1="170" x2="${cx + 126}" y2="170" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>

  <!-- 分级轮：密集细叶片（不是螺旋桨） -->
  <g>
    <circle cx="${cx}" cy="170" r="44" fill="none" stroke="${C.blue}" stroke-width="1.6"/>
    <circle cx="${cx}" cy="170" r="12" fill="none" stroke="${C.blue}" stroke-width="1.4"/>
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI * 2) / 16, r1 = 12, r2 = 44;
      return `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(170 + Math.sin(a) * r1).toFixed(1)}"
                    x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(170 + Math.sin(a) * r2).toFixed(1)}"
                    stroke="${C.blue}" stroke-width="1.1"/>`;
    }).join('')}
  </g>

  <!-- 底部拉瓦尔喷嘴：朝内交汇 -->
  <g stroke="${C.accent}" stroke-width="1.6" fill="none">
    <path d="M${cx - 96} 316 l34 -26"/>
    <path d="M${cx - 58} 322 l26 -30"/>
    <path d="M${cx + 58} 322 l-26 -30"/>
    <path d="M${cx + 96} 316 l-34 -26"/>
  </g>
  <text x="${cx - 150}" y="330" class="s" text-anchor="end">拉瓦尔喷嘴</text>

  <!-- 交汇点 -->
  <circle cx="${cx}" cy="292" r="3.2" fill="${C.accent}"/>
  <text x="${cx + 150}" y="300" class="s">高压气流交汇处物料自撞</text>

  <!-- 细粉上升 -->
  <g stroke="${C.blue}" stroke-width="1.2" fill="none">
    <path d="M${cx - 40} 250 V214" marker-end="url(#arb-${id})"/>
    <path d="M${cx} 250 V214" marker-end="url(#arb-${id})"/>
    <path d="M${cx + 40} 250 V214" marker-end="url(#arb-${id})"/>
  </g>

  <!-- 细粉出口 -->
  <path d="M${cx + 128} 186 H600" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 136}" y="204" class="s">细粉 → 旋风＋除尘器</text>

  <!-- 粗粉回落 -->
  <path d="M${cx - 118} 216 H150 v100 H${cx - 96}" stroke="${C.line}" stroke-width="1.2"
        stroke-dasharray="6 4" fill="none" marker-end="url(#ar-${id})"/>
  <text x="150" y="206" class="s">粗粉回落</text>

  <!-- 标注 -->
  <text x="${cx + 138}" y="104" class="h">分级轮</text>
  <text x="${cx + 138}" y="122" class="s">转速决定切割粒径</text>

  <text x="${cx - 132}" y="112" class="h" text-anchor="end">粉碎区</text>
  <text x="${cx - 132}" y="130" class="s" text-anchor="end">物料自磨</text>
  <text x="${cx + 60}" y="386" class="h">卸料口</text>`;
}

/* ============ MQL 立式流化床 ============ */
function mql(id) {
  const cx = 330;
  return `
  <!-- 更高的直筒 + 平底锥斗：立式转子 -->
  ${shell(id, vessel(id, {cx, top: 84, waist: 284, bottom: 358, halfW: 114, halfBottom: 50}))}
  <rect x="${cx - 30}" y="358" width="60" height="24" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <!-- 立式转子：一根长轴 + 单个顶部叶轮 -->
  <line x1="${cx}" y1="132" x2="${cx}" y2="284" stroke="${C.blue}" stroke-width="1.6"/>
  <rect x="${cx - 5}" y="126" width="10" height="10" fill="${C.blue}"/>
  <g>
    <circle cx="${cx}" cy="150" r="38" fill="none" stroke="${C.blue}" stroke-width="1.6"/>
    <circle cx="${cx}" cy="150" r="10" fill="none" stroke="${C.blue}" stroke-width="1.3"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI * 2) / 12;
      return `<line x1="${(cx + Math.cos(a) * 10).toFixed(1)}" y1="${(150 + Math.sin(a) * 10).toFixed(1)}"
                    x2="${(cx + Math.cos(a) * 38).toFixed(1)}" y2="${(150 + Math.sin(a) * 38).toFixed(1)}"
                    stroke="${C.blue}" stroke-width="1.1"/>`;
    }).join('')}
  </g>
  <line x1="${cx - 104}" y1="196" x2="${cx + 114}" y2="196" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>
  <!-- 底部喷嘴 -->
  <g stroke="${C.accent}" stroke-width="1.6" fill="none">
    <path d="M${cx - 84} 330 l32 -26"/><path d="M${cx - 48} 336 l24 -28"/>
    <path d="M${cx + 48} 336 l-24 -28"/><path d="M${cx + 84} 330 l-32 -26"/>
  </g>
  <circle cx="${cx}" cy="300" r="3" fill="${C.accent}"/>
  <!-- 细粉 -->
  <path d="M${cx + 114} 196 H580" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 122}" y="214" class="s">细粉出口（线速度 70m/s）</text>
  <!-- 粗粉 -->
  <path d="M${cx - 104} 190 H158 v96 H${cx - 84}" stroke="${C.line}" stroke-width="1.2"
        stroke-dasharray="6 4" fill="none" marker-end="url(#ar-${id})"/>
  <text x="158" y="180" class="s">粗粉回落</text>
  <text x="${cx + 128}" y="118" class="h">立式单转子</text>
  <text x="${cx + 128}" y="136" class="s">投资省、易做大产能</text>
  <text x="${cx - 150}" y="300" class="h" text-anchor="end">长轴传动</text>
  <text x="${cx - 150}" y="318" class="s" text-anchor="end">转速受轴长限制</text>
  <line x1="${cx - 144}" y1="296" x2="${cx - 6}" y2="240" stroke="${C.soft}" stroke-width="1"/>`;
}

/* ============ MQP 圆盘式 ============ */
function mqp(id) {
  const cx = 330, cy = 200;
  return `
  <!-- 扁圆盘腔：横躺的圆盘 + 切线喷嘴 -->
  ${shell(id, `M${cx - 130} ${cy - 66} a130 66 0 1 1 0 132 a130 66 0 1 1 0 -132 z`)}
  <ellipse cx="${cx}" cy="${cy}" rx="96" ry="48" fill="none" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>
  <!-- 中心进料喷射器 -->
  <circle cx="${cx}" cy="${cy}" r="15" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <line x1="${cx}" y1="${cy - 100}" x2="${cx}" y2="${cy - 66}" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>
  <text x="${cx}" y="${cy - 108}" class="s" text-anchor="middle">加料喷射器</text>
  <!-- 切线喷嘴：沿圆周切向喷射 -->
  <g stroke="${C.accent}" stroke-width="1.6" fill="none">
    <path d="M${cx - 150} ${cy - 38} L${cx - 112} ${cy - 24}"/>
    <path d="M${cx + 150} ${cy - 38} L${cx + 112} ${cy - 24}"/>
    <path d="M${cx - 150} ${cy + 38} L${cx - 112} ${cy + 24}"/>
    <path d="M${cx + 150} ${cy + 38} L${cx + 112} ${cy + 24}"/>
  </g>
  <text x="${cx - 156}" y="${cy + 86}" class="s" text-anchor="end">切线喷嘴（切线方向喷射）</text>
  <text x="${cx + 176}" y="${cy - 52}" class="s">多喷嘴，无传动部件</text>
  <!-- 自分级：内圈细粉从中心出 -->
  <path d="M${cx}" y1="${cy}" x2="${cx}" y2="${cy - 66}" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 20}" y="${cy - 74}" class="s">细粉从中心引出</text>
  <text x="${cx}" y="${cy + 112}" class="s" text-anchor="middle">物料沿壁面切向撞击摩擦而粉碎</text>`;
}

/* ============ 蒸汽动能磨 ============ */
function steam(id) {
  const cx = 330;
  return `
  ${shell(id, vessel(id, {cx, top: 100, waist: 256, bottom: 338, halfW: 126, halfBottom: 54}))}
  <rect x="${cx - 32}" y="338" width="64" height="24" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <!-- 保温层：双线外包 -->
  <path d="M${cx - 132} 90 v176 M${cx + 132} 90 v176" stroke="${C.line}" stroke-width="1" stroke-dasharray="3 5"/>
  <text x="${cx + 140}" y="82" class="s">保温层</text>
  <!-- 高温蒸汽入口 -->
  <rect x="${cx - 22}" y="62" width="44" height="38" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <line x1="${cx}" y1="24" x2="${cx}" y2="62" stroke="${C.accent}" stroke-width="1.8" marker-end="url(#ar-${id})"/>
  <text x="${cx + 12}" y="34" class="s">过热蒸汽 8–40bar / 230–360℃</text>
  <!-- 分级轮 -->
  <circle cx="${cx}" cy="172" r="42" fill="none" stroke="${C.blue}" stroke-width="1.6"/>
  <circle cx="${cx}" cy="172" r="11" fill="none" stroke="${C.blue}" stroke-width="1.3"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI * 2) / 14;
    return `<line x1="${(cx + Math.cos(a) * 11).toFixed(1)}" y1="${(172 + Math.sin(a) * 11).toFixed(1)}"
                  x2="${(cx + Math.cos(a) * 42).toFixed(1)}" y2="${(172 + Math.sin(a) * 42).toFixed(1)}"
                  stroke="${C.blue}" stroke-width="1.1"/>`;
  }).join('')}
  <!-- 喷嘴 1020m/s -->
  <g stroke="${C.accent}" stroke-width="1.6" fill="none">
    <path d="M${cx - 92} 314 l32 -26"/><path d="M${cx - 56} 320 l24 -28"/>
    <path d="M${cx + 56} 320 l-24 -28"/><path d="M${cx + 92} 314 l-32 -26"/>
  </g>
  <circle cx="${cx}" cy="288" r="3.2" fill="${C.accent}"/>
  <text x="${cx - 158}" y="330" class="s" text-anchor="end">喷嘴出口 1020 m/s</text>
  <line x1="${cx - 150}" y1="326" x2="${cx - 74}" y2="306" stroke="${C.soft}" stroke-width="1"/>
  <path d="M${cx + 132} 210 H590" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 140}" y="228" class="s">细粉 → 保温收集</text>
  <path d="M${cx - 116} 202 H152 v100 H${cx - 92}" stroke="${C.line}" stroke-width="1.2"
        stroke-dasharray="6 4" fill="none" marker-end="url(#ar-${id})"/>
  <text x="152" y="192" class="s">粗粉回落</text>
  <text x="${cx + 144}" y="108" class="h">干法亚微米</text>
  <text x="${cx + 144}" y="126" class="s">D50 0.5μm 起</text>`;
}

/* ============ CSM 空气分级磨 ============ */
function csm(id) {
  const cx = 330;
  return `
  <!-- 横置圆筒：左粉碎室 + 右分级室 -->
  ${shell(id, `M170 132 h300 a14 14 0 0 1 14 14 v108 a14 14 0 0 1 -14 14 h-300 a14 14 0 0 1 -14 -14 v-108 a14 14 0 0 1 14 -14 z`)}
  <line x1="${cx + 40}" y1="132" x2="${cx + 40}" y2="268" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>
  <!-- 粉碎盘（转子） -->
  <circle cx="234" cy="200" r="46" fill="none" stroke="${C.ink}" stroke-width="1.6"/>
  <line x1="234" y1="200" x2="234" y2="272" stroke="${C.ink}" stroke-width="1.6"/>
  <!-- 锤头 -->
  ${Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI * 2) / 6;
    return `<rect x="${(234 + Math.cos(a) * 46 - 6).toFixed(1)}" y="${(200 + Math.sin(a) * 46 - 6).toFixed(1)}"
                  width="12" height="12" fill="${C.accent}" opacity=".85"/>`;
  }).join('')}
  <!-- 齿圈 -->
  <circle cx="234" cy="200" r="62" fill="none" stroke="${C.line}" stroke-width="1.2" stroke-dasharray="4 4"/>
  <text x="234" y="120" class="h" text-anchor="middle">粉碎盘＋齿圈</text>
  <text x="234" y="316" class="s" text-anchor="middle">冲击、剪切、摩擦</text>
  <!-- 分级轮 -->
  <circle cx="${cx + 96}" cy="200" r="40" fill="none" stroke="${C.blue}" stroke-width="1.6"/>
  <circle cx="${cx + 96}" cy="200" r="11" fill="none" stroke="${C.blue}" stroke-width="1.3"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI * 2) / 14;
    return `<line x1="${(cx + 96 + Math.cos(a) * 11).toFixed(1)}" y1="${(200 + Math.sin(a) * 11).toFixed(1)}"
                  x2="${(cx + 96 + Math.cos(a) * 40).toFixed(1)}" y2="${(200 + Math.sin(a) * 40).toFixed(1)}"
                  stroke="${C.blue}" stroke-width="1.1"/>`;
  }).join('')}
  <text x="${cx + 96}" y="112" class="h" text-anchor="middle">分级轮</text>
  <line x1="${cx + 96}" y1="118" x2="${cx + 96}" y2="152" stroke="${C.soft}" stroke-width="1"/>
  <text x="${cx + 96}" y="296" class="s" text-anchor="middle">变频调速即调粒度</text>
  <!-- 进料 / 出料 -->
  <line x1="196" y1="88" x2="196" y2="132" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>
  <text x="196" y="80" class="s" text-anchor="middle">进料</text>
  <path d="M${cx + 136} 196 H600" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 150}" y="236" class="s">细粉 → 收集</text>
  <!-- 粗粉回流 -->
  <path d="M${cx + 40} 268 v34 H196 v-20" stroke="${C.line}" stroke-width="1.2" stroke-dasharray="6 4"
        fill="none" marker-end="url(#ar-${id})"/>
  <text x="${cx + 48}" y="316" class="s">粗粉返回粉碎区</text>`;
}

/* ============ 针盘磨 ============ */
function pin(id) {
  const cx = 330;
  return `
  ${shell(id, `M196 138 h268 a14 14 0 0 1 14 14 v96 a14 14 0 0 1 -14 14 h-268 a14 14 0 0 1 -14 -14 v-96 a14 14 0 0 1 14 -14 z`)}
  <!-- 左固定盘 + 右转动盘，棒销相间 -->
  <line x1="${cx - 20}" y1="138" x2="${cx - 20}" y2="262" stroke="${C.ink}" stroke-width="1.6"/>
  <line x1="${cx + 30}" y1="138" x2="${cx + 30}" y2="262" stroke="${C.ink}" stroke-width="1.6"/>
  ${[0, 1, 2, 3].map(i => {
    const y = 158 + i * 26;
    return `<rect x="${cx - 34}" y="${y}" width="26" height="9" fill="${C.accent}" opacity=".85"/>
            <rect x="${cx + 32}" y="${y + 13}" width="26" height="9" fill="${C.accent}" opacity=".85"/>`;
  }).join('')}
  <line x1="${cx + 56}" y1="200" x2="${cx + 96}" y2="200" stroke="${C.ink}" stroke-width="1.6"/>
  <text x="${cx - 44}" y="128" class="s" text-anchor="middle">静盘</text>
  <text x="${cx + 52}" y="128" class="s" text-anchor="middle">动盘（棒销）</text>
  <line x1="${cx - 64}" y1="${cx}" x2="${cx - 64}" y2="138" stroke="${C.ink}" stroke-width="1.4"/>
  <line x1="236" y1="96" x2="236" y2="138" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>
  <text x="236" y="88" class="s" text-anchor="middle">进料（中心）</text>
  <path d="M${cx + 96} 200 H596" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 104}" y="222" class="s">无筛网，出料流畅</text>
  <text x="196" y="292" class="s">双动力可选，线速度 200 m/s 以上</text>
  <text x="196" y="312" class="s">装配间隙控制 2 至 3 mm</text>`;
}

/* ============ 锤式磨 ============ */
function hammer(id) {
  const cx = 330;
  return `
  ${shell(id, `M206 140 h240 a14 14 0 0 1 14 14 v92 a14 14 0 0 1 -14 14 h-240 a14 14 0 0 1 -14 -14 v-92 a14 14 0 0 1 14 -14 z`)}
  <!-- 转子 + 锤片 -->
  <circle cx="${cx}" cy="200" r="14" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.6"/>
  ${Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI * 2) / 6, x = cx + Math.cos(a) * 44, y = 200 + Math.sin(a) * 44;
    return `<line x1="${(cx + Math.cos(a) * 14).toFixed(1)}" y1="${(200 + Math.sin(a) * 14).toFixed(1)}"
                  x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.ink}" stroke-width="1.3"/>
            <rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10"
                  fill="${C.accent}" opacity=".85"/>`;
  }).join('')}
  <text x="${cx}" y="128" class="h" text-anchor="middle">转子锤片</text>
  <!-- 筛网（弧形，包住下半圈） -->
  <path d="M${cx - 92} 200 a92 92 0 0 0 184 0" fill="none" stroke="${C.line}" stroke-width="2.2"
        stroke-dasharray="2 5"/>
  <text x="${cx}" y="306" class="s" text-anchor="middle">筛网孔径决定出料粒径</text>
  <line x1="${cx}" y1="96" x2="${cx}" y2="140" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>
  <text x="${cx}" y="88" class="s" text-anchor="middle">进料</text>
  <path d="M${cx - 96} 268 H150" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="150" y="286" class="s">出料（穿过筛网）</text>`;
}

/* ============ RTM 涡流磨 ============ */
function rtm(id) {
  const cx = 340;
  return `
  ${shell(id, `M${cx - 112} 120 h224 a14 14 0 0 1 14 14 v128 a14 14 0 0 1 -14 14 h-224 a14 14 0 0 1 -14 -14 v-128 a14 14 0 0 1 14 -14 z`)}
  <!-- 多层涡流刀头 -->
  ${[0, 1, 2, 3].map(i => `<line x1="${cx - 92}" y1="${152 + i * 30}" x2="${cx + 92}" y2="${152 + i * 30}"
        stroke="${C.ink}" stroke-width="1.3"/>
      <text x="${cx + 100}" y="${156 + i * 30}" class="s">第 ${i + 1} 层</text>`).join('')}
  <!-- 涡流回旋箭头 -->
  <path d="M${cx - 60} 200 a46 46 0 1 1 92 0" fill="none" stroke="${C.accent}" stroke-width="1.4"
        marker-end="url(#ar-${id})" stroke-dasharray="7 5"/>
  <text x="${cx}" y="212" class="s" text-anchor="middle">强涡流 120 m/s</text>
  <text x="${cx}" y="232" class="s" text-anchor="middle">停留时间极短，温升低</text>
  <line x1="${cx}" y1="78" x2="${cx}" y2="120" stroke="${C.ink}" stroke-width="1.4" marker-end="url(#ar-${id})"/>
  <text x="${cx}" y="70" class="s" text-anchor="middle">进料</text>
  <path d="M${cx + 126} 236 H626" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 134}" y="254" class="s">出料</text>
  <text x="${cx - 126}" y="300" class="s">专治团聚体：打散而不破坏一次粒径</text>`;
}

/* ============ 振动磨 ============ */
function mz(id) {
  const cx = 330;
  return `
  <!-- 磨筒 + 激振器 -->
  ${shell(id, `M${cx - 150} 168 a150 42 0 0 0 300 0 a150 42 0 0 0 -300 0 z`)}
  <ellipse cx="${cx}" cy="168" rx="150" ry="42" fill="none" stroke="${C.ink}" stroke-width="1.6"/>
  <ellipse cx="${cx}" cy="168" rx="150" ry="24" fill="none" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>
  <!-- 研磨介质 -->
  ${[[-108, 176], [-74, 164], [-40, 178], [6, 166], [44, 178], [80, 164], [112, 176], [-20, 190], [58, 192]]
    .map(([dx, y]) => `<circle cx="${cx + dx}" cy="${y}" r="11" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.2"/>`).join('')}
  <!-- 激振器 -->
  <rect x="${cx - 26}" y="212" width="52" height="34" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <text x="${cx}" y="234" class="s" text-anchor="middle">激振器</text>
  <g stroke="${C.accent}" stroke-width="1.3" fill="none">
    <path d="${`M${cx - 40} 252 q10 8 20 0 q10 -8 20 0`}"/>
    <path d="${`M${cx - 40} 268 q10 8 20 0 q10 -8 20 0`}"/>
  </g>
  <text x="${cx}" y="296" class="s" text-anchor="middle">高频振动：抛射＋自转＋公转</text>
  <text x="${cx + 160}" y="130" class="h">棒 / 段 / 球介质</text>
  <text x="${cx + 160}" y="148" class="s">粉碎同时均匀混合</text>
  <text x="${cx - 160}" y="130" class="h" text-anchor="end">中药专用机型</text>
  <text x="${cx - 160}" y="148" class="s" text-anchor="end">直接对接</text>`;
}

/* ============ 气流分级机 ============ */
function classifier(id) {
  const cx = 300;
  return `
  ${shell(id, vessel(id, {cx, top: 96, waist: 266, bottom: 352, halfW: 106, halfBottom: 50}))}
  <rect x="${cx - 28}" y="352" width="56" height="26" fill="url(#steel-${id})" stroke="${C.ink}" stroke-width="1.4"/>
  <!-- 进料从下端 -->
  <line x1="${cx - 150}" y1="300" x2="${cx - 96}" y2="300" stroke="${C.ink}" stroke-width="1.5" marker-end="url(#ar-${id})"/>
  <text x="${cx - 158}" y="292" class="s" text-anchor="end">物料随上升气流进入</text>
  <!-- 分级轮（无粉碎区，只有分级） -->
  <circle cx="${cx}" cy="156" r="46" fill="none" stroke="${C.blue}" stroke-width="1.7"/>
  <circle cx="${cx}" cy="156" r="12" fill="none" stroke="${C.blue}" stroke-width="1.4"/>
  ${Array.from({ length: 18 }, (_, i) => {
    const a = (i * Math.PI * 2) / 18;
    return `<line x1="${(cx + Math.cos(a) * 12).toFixed(1)}" y1="${(156 + Math.sin(a) * 12).toFixed(1)}"
                  x2="${(cx + Math.cos(a) * 46).toFixed(1)}" y2="${(156 + Math.sin(a) * 46).toFixed(1)}"
                  stroke="${C.blue}" stroke-width="1"/>`;
  }).join('')}
  <text x="${cx + 128}" y="132" class="h">分级涡轮</text>
  <text x="${cx + 128}" y="150" class="s">立式转速低、耐磨损</text>
  <!-- 二次风淘洗 -->
  <g stroke="${C.accent}" stroke-width="1.3" fill="none">
    <path d="M${cx - 92} 268 v-34" marker-end="url(#ar-${id})"/>
    <path d="M${cx + 92} 268 v-34" marker-end="url(#ar-${id})"/>
  </g>
  <text x="${cx - 112}" y="246" class="s" text-anchor="end">二次风淘洗</text>
  <line x1="${cx - 96}" y1="196" x2="${cx + 106}" y2="196" stroke="${C.soft}" stroke-width="1" stroke-dasharray="5 4"/>
  <path d="M${cx + 106} 226 H560" stroke="${C.ok}" stroke-width="1.6" marker-end="url(#arg-${id})"/>
  <text x="${cx + 114}" y="212" class="s">细粉 → 收集</text>
  <text x="${cx - 112}" y="86" class="s" text-anchor="end">本设备不粉碎，只按粒径切开</text>`;
}

const MAP = { mqw, mql, mqp, 'steam-jet': steam, csm, 'cum-p': pin, 'cum-f': hammer, rtm, mz, classifier };

function build(id, drawer) {
  const body = drawer(id);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
${defs(id)}
<style>
  .h{font:600 12.5px -apple-system,"PingFang SC",sans-serif;fill:${C.ink}}
  .s{font:11.5px -apple-system,"PingFang SC",sans-serif;fill:#6E747B}
</style>
<rect width="${W}" height="${H}" fill="${C.paper}"/>
<!-- 整机居中：主体锚点 (140..580, 60..420) 平移到画布中心 -->
<g transform="translate(28, 6)">${body}</g>
</svg>`;
  fs.writeFileSync(path.join(OUT, `cutaway-${id}.svg`), svg);
  console.log('wrote cutaway-' + id + '.svg', svg.length, 'bytes');
}

Object.entries(MAP).forEach(([id, fn]) => build(id, fn));