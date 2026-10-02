// ApnaDairy farm-to-home animation — drawing helpers (people, animals, props)
// everything returns an svg string; render(t) composes scenes from these.

const C = {
  cream: '#f7f1e3', malai: '#fffcf4', forest: '#1f4d36', deep: '#173a28', haldi: '#e2a93b',
  mint: '#cfe5d3', ink: '#1e2b22', mud: '#c9945f', mudDark: '#a87648', steel: '#c9cfd2', steelDark: '#8e979c',
  milk: '#fffdf6', skin1: '#a8693f', skin2: '#8a5533', skin3: '#b97c52', hair: '#22160f',
}

let T = 0 // current time, set by render()
const setT = (t) => { T = t }
const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.cos(p * Math.PI * 2.5) * Math.exp(-5 * p))
const blinkOf = (seed) => ((T * 0.55 + seed * 0.37) % 3.1) < 0.12
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const seg = (t, a, b) => clamp((t - a) / (b - a))
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const lerp = (a, b, p) => a + (b - a) * p
const g = (tr, inner, extra = '') => `<g transform="${tr}" ${extra}>${inner}</g>`

// ---------- people (feet at 0,0, facing right, ~210 tall at scale 1) ----------
function arm(x, y, angle, sleeve, skin, holding = '') {
  return g(`translate(${x} ${y}) rotate(${angle})`,
    `<rect x="-7" y="0" width="14" height="62" rx="7" fill="${sleeve}"/>
     <circle cx="0" cy="66" r="7.5" fill="${skin}"/>${holding}`)
}

function legs(shalwar, walk) {
  const a = Math.sin(walk) * 16
  return g(`rotate(${a} -8 -92)`, `<path d="M-20 -92 L4 -92 L0 -6 L-14 -6 Z" fill="${shalwar}"/><ellipse cx="-6" cy="-3" rx="12" ry="5" fill="#3b2a1e"/>`) +
    g(`rotate(${-a} 8 -92)`, `<path d="M-4 -92 L20 -92 L14 -6 L0 -6 Z" fill="${shalwar}"/><ellipse cx="9" cy="-3" rx="12" ry="5" fill="#3b2a1e"/>`)
}

function head(o) {
  const s = o.skin
  let top = ''
  if (o.head === 'pagri') top = `<path d="M-19 -202 C-22 -230 22 -232 20 -204 C 14 -212 -14 -212 -19 -202 Z" fill="${o.pagri || '#f4efe2'}"/>
      <path d="M-18 -206 C -6 -214 8 -214 19 -207" stroke="#d9cfb8" stroke-width="2" fill="none"/>
      <path d="M-19 -204 C -26 -200 -30 -190 -27 -180" stroke="${o.pagri || '#f4efe2'}" stroke-width="6" fill="none" stroke-linecap="round"/>`
  if (o.head === 'topi') top = `<path d="M-16 -204 Q0 -222 16 -204 Z" fill="${o.topi || '#fffcf4'}"/><path d="M-16 -204 L16 -204" stroke="#d8cfb6" stroke-width="2"/>`
  if (o.head === 'cap') top = `<path d="M-17 -201 Q-16 -224 4 -224 Q18 -223 18 -203 Z" fill="${C.forest}"/><path d="M14 -204 L32 -201 L14 -199 Z" fill="${C.deep}"/><circle cx="1" cy="-213" r="3" fill="${C.haldi}"/>`
  if (o.head === 'helmet') top = `<path d="M-20 -196 Q-20 -228 2 -228 Q22 -227 22 -198 Z" fill="${C.haldi}"/><path d="M6 -206 L22 -206 L22 -196 L6 -198 Z" fill="#2c3e46" opacity=".8"/>`
  const hair = o.head === 'none' || !o.head ? `<path d="M-17 -196 Q-16 -219 2 -218 Q18 -218 17 -197 Q8 -207 -17 -196 Z" fill="${C.hair}"/>` : ''
  const beard = o.beard ? `<path d="M-14 -192 Q-15 -170 1 -166 Q16 -169 16 -190 Q10 -182 1 -182 Q-7 -182 -14 -192 Z" fill="${o.beardColor || C.hair}"/>` : ''
  const mustache = o.beard || o.mustache ? `<path d="M3 -186 Q9 -189 15 -186" stroke="${o.beardColor || C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ''
  const smile = o.smile ? `<path d="M6 -183 Q11 -${179 - o.smile * 2} 15 -183" stroke="#5a2e1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : ''
  const bob = o.nod ? Math.sin(o.nod) * 4 : 0
  return g(`rotate(${bob} 0 -175)`, `
    <rect x="-6" y="-176" width="12" height="12" fill="${s}"/>
    <ellipse cx="0" cy="-194" rx="17" ry="20" fill="${s}"/>
    <ellipse cx="-12" cy="-193" rx="4" ry="6" fill="${s}"/>
    ${hair}
    <ellipse cx="8" cy="-198" rx="2.3" ry="${blinkOf(o.seed ?? (o.x || 0) * 0.011) ? 0.4 : 2.3}" fill="#24160e"/>
    <path d="M4 -205 Q9 -207 13 -205" stroke="#24160e" stroke-width="1.6" fill="none"/>
    ${beard}${mustache}${smile}${top}`)
}

// man in shalwar kameez; vest = waistcoat colour; armL/armR in degrees (0 = hanging down)
function man(o = {}) {
  const k = o.kameez || '#e9e1cd', sh = o.shalwar || k, skin = o.skin || C.skin1
  const vest = o.vest ? `<path d="M-24 -166 L24 -166 L26 -110 L-26 -110 Z" fill="${o.vest}"/><path d="M0 -166 L0 -112" stroke="${C.malai}" stroke-opacity=".35" stroke-width="2"/>
    <circle cx="4" cy="-150" r="1.8" fill="${C.haldi}"/><circle cx="4" cy="-136" r="1.8" fill="${C.haldi}"/><circle cx="4" cy="-122" r="1.8" fill="${C.haldi}"/>` : ''
  const body = `
    ${arm(-22, -162, o.armL ?? 8, k, skin, o.holdL || '')}
    ${o.noLegs ? `<path d="M-10 -70 L22 -66 L30 -20" stroke="${sh}" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="34" cy="-12" rx="12" ry="5" fill="#3b2a1e"/>` : legs(sh, o.walk || 0)}
    <path d="M-25 -168 Q0 -174 25 -168 L33 -58 Q0 -50 -33 -58 Z" fill="${k}"/>
    <path d="M-2 -168 L-2 -138" stroke="#00000022" stroke-width="2"/>
    ${vest}
    ${head({ ...o, skin })}
    ${arm(22, -162, o.armR ?? -8, k, skin, o.holdR || '')}`
  const bob = o.walk ? -Math.abs(Math.sin(o.walk)) * 5 : Math.sin(T * 2.4 + (o.seed || 0)) * 1.3
  return g(`translate(${o.x || 0} ${o.y || 0}) scale(${o.flip ? -(o.s || 1) : o.s || 1} ${o.s || 1})`, `<ellipse cx="0" cy="1" rx="${o.shadowW || 36}" ry="7" fill="#1e2b22" opacity="${o.noShadow || o.noLegs ? 0 : 0.14}"/>` + g(`translate(0 ${(o.bounce || 0) + bob})`, body))
}

// woman in shalwar kameez with dupatta over her head and shoulders
function woman(o = {}) {
  const k = o.kameez || '#b8455a', d = o.dupatta || '#e7b9c4', skin = o.skin || C.skin3
  const body = `
    ${arm(-20, -160, o.armL ?? 10, k, skin, o.holdL || '')}
    ${legs(o.shalwar || '#f1e6d6', o.walk || 0)}
    <path d="M-23 -166 Q0 -172 23 -166 L32 -44 Q0 -36 -32 -44 Z" fill="${k}"/>
    <path d="M-20 -120 Q0 -112 20 -120" stroke="${C.haldi}" stroke-width="3" fill="none" opacity=".8"/>
    <rect x="-6" y="-176" width="12" height="12" fill="${skin}"/>
    <ellipse cx="0" cy="-193" rx="16" ry="19" fill="${skin}"/>
    <ellipse cx="7" cy="-197" rx="2.2" ry="${blinkOf((o.seed ?? (o.x || 0) * 0.011) + 1.3) ? 0.4 : 2.2}" fill="#24160e"/>
    ${o.smile ? `<path d="M5 -183 Q9 -179 13 -183" stroke="#5a2e1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : ''}
    <path d="M-24 -190 Q-24 -222 0 -222 Q22 -222 21 -200 Q12 -212 -2 -211 Q-16 -208 -16 -186 L-18 -150 L-30 -60 L-38 -64 L-28 -160 Z" fill="${d}"/>
    <path d="M21 -200 Q26 -180 24 -164 Q10 -160 -2 -168" fill="none" stroke="${d}" stroke-width="7" stroke-linecap="round"/>
    ${arm(20, -160, o.armR ?? -10, k, skin, o.holdR || '')}`
  return g(`translate(${o.x || 0} ${o.y || 0}) scale(${o.flip ? -(o.s || 1) : o.s || 1} ${o.s || 1})`, `<ellipse cx="0" cy="1" rx="${o.shadowW || 36}" ry="7" fill="#1e2b22" opacity="${o.noShadow ? 0 : 0.14}"/>` + g(`translate(0 ${(o.hop || 0) + Math.sin(T * 2.2 + (o.seed || 2)) * 1.2})`, body))
}

// ---------- animals & props ----------
function buffalo(x, y, s = 1, chew = 0, flip = false) {
  const hb = Math.sin(chew) * 3
  return g(`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`, `
    <ellipse cx="10" cy="2" rx="110" ry="10" fill="#1e2b22" opacity=".14"/>
    <rect x="-70" y="-60" width="16" height="60" rx="5" fill="#262626"/><rect x="-40" y="-60" width="16" height="60" rx="5" fill="#2e2e2e"/>
    <rect x="30" y="-60" width="16" height="60" rx="5" fill="#262626"/><rect x="55" y="-60" width="16" height="60" rx="5" fill="#2e2e2e"/>
    <ellipse cx="0" cy="-80" rx="92" ry="46" fill="#333"/>
    <path d="M-90 -88 Q${-112 + Math.sin(chew * 1.3) * 10} -70 ${-104 + Math.sin(chew * 1.3 + 1) * 14} -40" stroke="#333" stroke-width="6" fill="none" stroke-linecap="round"/>
    ${g(`translate(0 ${hb})`, `
      <ellipse cx="96" cy="-74" rx="30" ry="24" fill="#2b2b2b"/>
      <ellipse cx="118" cy="-64" rx="15" ry="12" fill="#4a4a4a"/>
      <path d="M78 -94 Q62 -122 96 -120" stroke="#5a5048" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M104 -96 Q118 -124 134 -104" stroke="#5a5048" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="104" cy="-80" r="3" fill="#ddd"/>`)}`)
}

function churn(x, y, s = 1, fill = 0, label = '') {
  return g(`translate(${x} ${y}) scale(${s})`, `
    <defs><linearGradient id="st" x1="0" x2="1"><stop offset="0" stop-color="#9aa3a8"/><stop offset=".45" stop-color="#eef1f2"/><stop offset="1" stop-color="#8e979c"/></linearGradient></defs>
    <ellipse cx="0" cy="1" rx="34" ry="5" fill="#1e2b22" opacity=".14"/>
    <rect x="-16" y="-96" width="32" height="10" rx="3" fill="#8e979c"/>
    <rect x="-11" y="-86" width="22" height="14" fill="url(#st)"/>
    <path d="M-11 -72 L-30 -54 L-30 -6 Q-30 0 -24 0 L24 0 Q30 0 30 -6 L30 -54 L11 -72 Z" fill="url(#st)"/>
    <rect x="-30" y="-36" width="60" height="7" fill="#a3abb0"/>
    <path d="M-30 -52 Q-42 -52 -42 -40 M30 -52 Q42 -52 42 -40" stroke="#8e979c" stroke-width="4" fill="none"/>
    ${label ? `<text x="0" y="-14" text-anchor="middle" font-size="9" font-weight="700" fill="${C.deep}">${label}</text>` : ''}`)
}

function caption(t, num, urdu, en, start, end) {
  const a = clamp(Math.min(seg(t, start + 0.2, start + 0.9), 1 - seg(t, end - 0.7, end - 0.1)))
  if (a <= 0) return ''
  const y = lerp(-16, 0, easeOut(seg(t, start + 0.2, start + 1.0)))
  return g(`translate(0 ${y})`, `
    <rect x="36" y="34" width="${Math.max(urdu.length, en.length * 1.15) * 13 + 110}" height="86" rx="22" fill="${C.deep}" opacity=".9"/>
    <circle cx="82" cy="77" r="24" fill="${C.haldi}"/>
    <text x="82" y="86" text-anchor="middle" font-size="26" font-weight="800" fill="${C.deep}">${num}</text>
    <text x="122" y="72" font-size="26" font-weight="700" fill="${C.cream}">${urdu}</text>
    <text x="122" y="100" font-size="18" fill="${C.cream}" opacity=".75">${en}</text>`, `opacity="${a}"`)
}

function bubble(x, y, text, a, flip = false, w) {
  if (a <= 0) return ''
  const width = w || text.length * 11 + 36
  const sc = lerp(0.6, 1, easeOut(clamp(a * 2)))
  return g(`translate(${x} ${y}) scale(${sc})`, `
    <rect x="${flip ? -width : 0}" y="-46" width="${width}" height="46" rx="23" fill="${C.malai}" stroke="${C.deep}" stroke-width="2.5"/>
    <path d="M${flip ? -22 : 22} 0 L${flip ? -14 : 14} 16 L${flip ? -36 : 36} 0 Z" fill="${C.malai}" stroke="${C.deep}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="${flip ? -40 : 18}" y="-3" width="22" height="6" fill="${C.malai}"/>
    <text x="${flip ? -width / 2 : width / 2}" y="-16" text-anchor="middle" font-size="20" font-weight="700" fill="${C.deep}">${text}</text>`, `opacity="${clamp(a)}"`)
}

// sun + soft rays
const sun = (x, y, r, glow = 1) => `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${C.haldi}" opacity="${0.12 * glow}"/><circle cx="${x}" cy="${y}" r="${r * 1.4}" fill="${C.haldi}" opacity="${0.18 * glow}"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f2b84a"/>`

function birds(t, x0, y0) {
  let s = ''
  for (let i = 0; i < 4; i++) {
    const x = x0 + t * 40 + i * 34, y = y0 + Math.sin(t * 2 + i) * 6 + (i % 2) * 14
    const f = Math.sin(t * 9 + i) * 5
    s += `<path d="M${x - 9} ${y - f} Q${x - 4} ${y - 6} ${x} ${y} Q${x + 4} ${y - 6} ${x + 9} ${y - f}" stroke="${C.deep}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
  }
  return s
}

// little pakistani pickup (loader) with truck-art trim
function loader(x, y, s, t, churns = 3, driver = true) {
  const wheel = (cx) => g(`translate(${cx} -8) rotate(${-t * 400})`, `<circle r="20" fill="#222"/><circle r="9" fill="#bbb"/><path d="M-9 0 L9 0 M0 -9 L0 9" stroke="#666" stroke-width="2"/>`)
  let load = ''
  for (let i = 0; i < churns; i++) load += churn(-150 + i * 46, -48, 0.62)
  return g(`translate(${x} ${y}) scale(${s})`, `
    <ellipse cx="-55" cy="10" rx="150" ry="9" fill="#1e2b22" opacity=".16"/>
    <rect x="-190" y="-58" width="160" height="40" rx="4" fill="#2d6b8a"/>
    <rect x="-190" y="-62" width="160" height="8" fill="${C.haldi}"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${-180 + i * 24}" cy="-36" r="5" fill="${['#d9445a', '#f2c14e', '#3fa37b', '#f08a3c'][i % 4]}"/>`).join('')}
    ${load}
    <path d="M-30 -96 L40 -96 Q62 -96 70 -70 L78 -40 L78 -18 L-30 -18 Z" fill="#e7e2d4"/>
    <path d="M-20 -88 L34 -88 Q50 -88 56 -70 L60 -56 L-20 -56 Z" fill="#9fc6d6"/>
    ${driver ? g('translate(10 -30) scale(.42)', head({ head: 'pagri', beard: true, skin: C.skin2 }).replace('<rect', '<rect')) : ''}
    <rect x="-30" y="-18" width="110" height="10" fill="#c9c3b3"/>
    <path d="M-30 -18 L-30 -28 L80 -28" stroke="${C.haldi}" stroke-width="4"/>
    <rect x="70" y="-46" width="10" height="8" fill="#ffd65a"/>
    ${wheel(-150)}${wheel(40)}`)
}

function bike(x, y, s, t, riding, rider = true) {
  const wheel = (cx) => g(`translate(${cx} 0) rotate(${riding ? -t * 500 : 0})`, `<circle r="26" fill="none" stroke="#222" stroke-width="7"/><path d="M-20 0 L20 0 M0 -20 L0 20" stroke="#888" stroke-width="2"/>`)
  return g(`translate(${x} ${y}) scale(${s})`, `
    ${wheel(-60)}${wheel(70)}
    <path d="M-60 0 L-10 -40 L40 -40 L70 0" stroke="#b6332e" stroke-width="9" fill="none" stroke-linejoin="round"/>
    <path d="M-28 -46 L22 -46" stroke="#222" stroke-width="10" stroke-linecap="round"/>
    <path d="M40 -40 L56 -78 L70 -80" stroke="#333" stroke-width="5" fill="none"/>
    <rect x="-118" y="-96" width="70" height="56" rx="8" fill="${C.malai}" stroke="${C.forest}" stroke-width="4"/>
    <text x="-83" y="-62" text-anchor="middle" font-size="13" font-weight="800" fill="${C.forest}">ApnaDairy</text>
    ${rider ? g('translate(-14 36) scale(.85)', man({ kameez: '#5c7f9a', shalwar: '#4b6a82', head: 'helmet', beard: true, skin: C.skin1, armR: -78, armL: -70, noLegs: true })) : ''}`)
}

// drifting clouds
function clouds(y, speed, opacity = 0.9) {
  return [0, 1, 2].map((i) => {
    const x = ((i * 520 + T * speed) % 1700) - 260
    const yy = y + (i % 2) * 40
    return `<g opacity="${opacity}"><ellipse cx="${x}" cy="${yy}" rx="70" ry="24" fill="#fffaf0"/><ellipse cx="${x + 40}" cy="${yy - 16}" rx="44" ry="26" fill="#fffaf0"/><ellipse cx="${x - 36}" cy="${yy - 8}" rx="34" ry="18" fill="#fffaf0"/></g>`
  }).join('')
}

// chulha smoke curling up from a chimney
function smoke(x, y) {
  return [0, 1, 2, 3].map((i) => {
    const p = ((T * 0.35 + i / 4) % 1)
    return `<circle cx="${x + Math.sin(p * 6 + i) * 12 + p * 30}" cy="${y - p * 140}" r="${8 + p * 22}" fill="#efe6d6" opacity="${0.55 * (1 - p)}"/>`
  }).join('')
}

// patang (kite) on a string, gently swaying
function kite(x, y, col, col2, seed = 0) {
  const sw = Math.sin(T * 1.6 + seed) * 8, dy = Math.sin(T * 1.1 + seed) * 6
  const kx = x + sw, ky = y + dy
  return `<path d="M${kx} ${ky + 26} Q${kx - 80} ${ky + 160} ${kx - 160} ${ky + 330}" stroke="#7a6a55" stroke-width="1.2" fill="none" opacity=".7"/>
    <g transform="rotate(${sw * 0.8} ${kx} ${ky})"><path d="M${kx} ${ky - 26} L${kx + 22} ${ky} L${kx} ${ky + 26} L${kx - 22} ${ky} Z" fill="${col}"/>
    <path d="M${kx} ${ky - 26} L${kx} ${ky + 26} M${kx - 22} ${ky} Q${kx} ${ky - 10} ${kx + 22} ${ky}" stroke="#ffffffaa" stroke-width="1.5" fill="none"/>
    <path d="M${kx} ${ky + 26} l-6 12 h12 z" fill="${col2}"/></g>`
}
