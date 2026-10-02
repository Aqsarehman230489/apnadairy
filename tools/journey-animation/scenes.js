// ApnaDairy farm-to-home animation — scenes and timeline. render(t) draws frame at time t (seconds).
const SCENES = [[0, 9], [9, 17], [17, 25.5], [25.5, 34.5], [34.5, 43], [43, 51.5], [51.5, 62], [62, 69]]
const INTRO = 3.5 // opening title card before the story
const DURATION = 69 + INTRO

const handPos = (sx, sy, s, angle, flip = false) => {
  const r = (angle * Math.PI) / 180
  const hx = 22 - 66 * Math.sin(r), hy = -162 + 66 * Math.cos(r)
  return [sx + (flip ? -hx : hx) * s, sy + hy * s]
}

// 1 — sunrise at the farm, milking into churns
function scene1(t) {
  const lt = t
  const sunY = lerp(470, 230, ease(seg(lt, 0, 7)))
  const pourA = lerp(-10, -82, ease(seg(lt, 2, 3.2)))
  const [hx, hy] = handPos(820, 600, 1.05, pourA)
  const pouring = lt > 3.1 && lt < 7.4
  const fill = seg(lt, 3.2, 7.2)
  return `
  <defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c27e"/><stop offset=".6" stop-color="#fde3b3"/><stop offset="1" stop-color="#fff1d6"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#dawn)"/>
  ${sun(1040, sunY, 56)}
  ${clouds(150, 14, 0.7)}
  ${birds(lt, 120, 140)}
  <path d="M0 430 C200 380 380 400 560 420 S900 380 1280 410 V720 H0 Z" fill="#9cbf8f" opacity=".7"/>
  <path d="M0 470 C260 440 520 460 760 470 S1100 450 1280 460 V720 H0 Z" fill="#7aa86f"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${-40 + i * 60} 520 L${1320 - i * 20} ${490 + i * 6}" stroke="#6a9a60" stroke-width="3" opacity=".5"/>`).join('')}
  <rect y="560" width="1280" height="160" fill="#c8a06a"/>
  <rect y="560" width="1280" height="10" fill="#b48c58"/>
  <!-- kacha house with flat roof -->
  <rect x="1010" y="380" width="250" height="190" fill="${C.mud}"/>
  <rect x="995" y="370" width="280" height="18" fill="${C.mudDark}"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${1000 + i * 40}" y="362" width="6" height="12" fill="#7a5532"/>`).join('')}
  <rect x="1200" y="330" width="26" height="40" fill="#8a5a33"/>${smoke(1213, 330)}
  <rect x="1150" y="450" width="60" height="120" rx="4" fill="#3f6b4f"/>
  <rect x="1040" y="430" width="50" height="40" fill="#5c3f26"/><rect x="1044" y="434" width="42" height="32" fill="#f7d58a" opacity=".6"/>
  <!-- charpai -->
  <rect x="1030" y="540" width="110" height="10" fill="#8a5a33"/><path d="M1032 540 L1138 540" stroke="#e9d9b8" stroke-width="5" stroke-dasharray="4 3"/>
  <rect x="1032" y="550" width="6" height="22" fill="#6d4426"/><rect x="1132" y="550" width="6" height="22" fill="#6d4426"/>
  <!-- trough with chara (fodder) -->
  <rect x="120" y="545" width="300" height="34" rx="8" fill="#9b7b5c"/><path d="M130 548 Q200 520 270 548 Q340 522 410 548" fill="#6d9a3e"/>
  ${buffalo(250, 640, 0.9, lt * 3)}
  ${buffalo(470, 660, 0.85, lt * 3 + 1.4)}
  ${woman({ x: 640, y: 640, s: 1.02, kameez: '#b8455a', dupatta: '#efc0c9', armR: -60 + Math.sin(lt * 2) * 8, holdR: `<path d="M-14 66 Q0 52 14 66 Q4 84 -10 80 Z" fill="#6d9a3e"/>`, smile: 1 })}
  ${churn(918, 640, 1.15, fill)}
  ${pouring ? [0, 1, 2, 3].map((i) => { const q = ((lt * 2.2 + i / 4) % 1); return `<circle cx="${918 + (i - 1.5) * 18 * q}" cy="${640 - 110 * 1.15 + 14 - q * 26 + q * q * 30}" r="${3.5 - q * 2}" fill="${C.milk}"/>` }).join('') : ''}
  ${pouring ? `<path d="M${hx + 8} ${hy + 6} Q${hx + 40} ${hy + 30} ${918} ${640 - 96 * 1.15 + 6}" stroke="${C.milk}" stroke-width="${7 + Math.sin(lt * 20)}" fill="none" stroke-linecap="round"/>` : ''}
  ${man({ x: 820, y: 640, s: 1.05, kameez: '#f0ead8', head: 'pagri', pagri: '#fbf7ec', beard: true, beardColor: '#3a2a20', skin: C.skin2, armR: pourA,
    holdR: `<g transform="rotate(${-pourA * 0.6} 0 70)"><path d="M-16 62 L16 62 L12 92 L-12 92 Z" fill="#c9cfd2" stroke="#8e979c" stroke-width="2"/><ellipse cx="0" cy="62" rx="16" ry="5" fill="${C.milk}"/></g>`, armL: 10, smile: 1 })}
  <!--cap-->${caption(t, 1, 'Subah savere, farm par taaza doodh', 'Fresh milk at sunrise on the farm', 0, 9)}`
}

// 2 — the loader on the village road through mustard fields
function scene2(t) {
  const lt = t - 9
  const sc = lt * 260
  const trees = [0, 1, 2, 3, 4, 5].map((i) => {
    const x = ((i * 290 - sc) % 1740 + 1740) % 1740 - 230
    return `<rect x="${x - 6}" y="350" width="14" height="90" fill="#6b4a2f"/><circle cx="${x}" cy="340" r="52" fill="#3f7a4a"/><circle cx="${x - 30}" cy="360" r="34" fill="#4c8a55"/><circle cx="${x + 30}" cy="358" r="36" fill="#367044"/>`
  }).join('')
  const flowers = Array.from({ length: 70 }, (_, i) => {
    const x = ((i * 37 - sc * 0.6) % 1300 + 1300) % 1300 - 10
    return `<circle cx="${x}" cy="${430 + (i % 5) * 12}" r="${4 + (i % 3)}" fill="#f3d03e"/>`
  }).join('')
  const dash = Array.from({ length: 10 }, (_, i) => {
    const x = ((i * 180 - sc * 1.4) % 1800 + 1800) % 1800 - 200
    return `<rect x="${x}" y="642" width="90" height="8" rx="4" fill="#f7f1e3" opacity=".8"/>`
  }).join('')
  const bounce = Math.sin(lt * 18) * 2.5
  const dust = [0, 1, 2].map((i) => {
    const p = ((lt * 1.6 + i / 3) % 1)
    return `<circle cx="${290 - p * 200}" cy="${610 - p * 40}" r="${10 + p * 26}" fill="#e3cfa8" opacity="${0.6 * (1 - p)}"/>`
  }).join('')
  return `
  <defs><linearGradient id="day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0e6"/><stop offset="1" stop-color="#eaf5ef"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#day)"/>
  ${sun(1100, 120, 40, 0.6)}
  ${clouds(120, 30, 0.95)}
  <path d="M${-sc * 0.1 % 400} 380 C200 320 400 340 640 360 S1000 320 1700 350 V720 H-400 Z" fill="#a9c9a4" opacity=".7"/>
  <rect y="400" width="1280" height="120" fill="#86b35a"/>
  ${flowers}
  ${trees}
  <rect y="520" width="1280" height="150" fill="#5c5f60"/>
  <rect y="516" width="1280" height="6" fill="#c8b48e"/><rect y="666" width="1280" height="54" fill="#c8a06a"/>
  ${dash}
  ${(() => { const bx = lerp(1500, -400, seg(lt, 1.2, 7.5)); return `<rect x="${bx - 4}" y="430" width="10" height="94" fill="#6b6b6b"/><rect x="${bx - 4}" y="430" width="10" height="94" transform="translate(150 0)" fill="#6b6b6b"/>
    <rect x="${bx - 20}" y="350" width="200" height="90" rx="10" fill="${C.forest}" stroke="${C.malai}" stroke-width="4"/>
    <text x="${bx + 80}" y="388" text-anchor="middle" font-family="Nastaliq" font-size="24" fill="${C.haldi}">ملک سینٹر ۲ کلومیٹر</text>
    <text x="${bx + 80}" y="426" text-anchor="middle" font-size="17" font-weight="800" fill="${C.cream}">Milk Center 2 km</text>` })()}
  ${dust}
  ${g(`rotate(${Math.sin(lt * 9) * 0.8} 720 640)`, loader(720, 640 + bounce, 2.1, lt, 4))}
  <!--cap-->${caption(t, 2, 'Loader mein doodh, mohallay ki milk shop tak', 'Driven to the local milk center', 9, 17)}`
}

// 3 — arriving at the area manager's milk shop
function scene3(t) {
  const lt = t - 17
  const walkP = ease(seg(lt, 0.3, 3.6))
  const fx = lerp(120, 600, walkP)
  const walking = lt > 0.3 && lt < 3.6
  const wave = lt > 3 && lt < 6 ? -150 + Math.sin(lt * 9) * 18 : -12
  return `
  <rect width="1280" height="720" fill="#bfe0ea"/>
  <rect y="600" width="1280" height="120" fill="#b9a68a"/><rect y="596" width="1280" height="8" fill="#9b8a70"/>
  <!-- neighbouring buildings -->
  <rect x="0" y="210" width="380" height="390" fill="#e4c9a2"/><rect x="40" y="250" width="80" height="70" fill="#7aa6b5"/><rect x="200" y="250" width="80" height="70" fill="#7aa6b5"/>
  <rect x="1190" y="230" width="90" height="370" fill="#d9b48e"/>
  <!-- the milk shop -->
  <rect x="420" y="190" width="760" height="410" fill="${C.cream}"/>
  <rect x="400" y="170" width="800" height="40" fill="${C.deep}"/>
  <rect x="460" y="214" width="680" height="96" rx="12" fill="${C.forest}"/>
  <text x="800" y="262" text-anchor="middle" font-family="Nastaliq" font-size="40" fill="${C.haldi}">اپنا ڈیری ملک سینٹر</text>
  <text x="800" y="296" text-anchor="middle" font-size="24" font-weight="800" fill="${C.cream}">ApnaDairy Milk Center</text>
  ${Array.from({ length: 16 }, (_, i) => `<path d="M${420 + i * 47.5} 320 h47.5 v34 q-23.75 16 -47.5 0 z" fill="${i % 2 ? C.forest : C.malai}"/>`).join('')}
  <path d="M420 360 Q800 ${392 + Math.sin(lt * 2) * 4} 1180 360" stroke="#7a6a55" stroke-width="1.5" fill="none"/>
  <rect x="460" y="370" width="680" height="230" fill="#efe4c9"/>
  <!-- chiller -->
  <rect x="980" y="380" width="140" height="220" rx="8" fill="#dfe8ea" stroke="#9fb2b7" stroke-width="4"/>
  <rect x="992" y="394" width="116" height="180" rx="4" fill="#cfe8f0"/>
  ${[0, 1, 2].map((i) => `<rect x="1004" y="${408 + i * 56}" width="92" height="40" rx="6" fill="${C.malai}"/>`).join('')}
  ${man({ x: 810, y: 625, s: 1.05, kameez: '#f3efe4', vest: C.forest, head: 'cap', beard: true, skin: C.skin1, armR: wave, smile: 1 })}
  <!-- counter -->
  <rect x="640" y="470" width="320" height="170" fill="#a87648"/><rect x="630" y="460" width="340" height="16" fill="#8a5a33"/>
  ${churn(520, 600, 0.95)}${churn(580, 600, 0.95)}
  <!-- parked loader -->
  ${loader(230, 640, 0.95, 0, 2, false)}
  ${man({ x: fx, y: 670, s: 1.05, kameez: '#f0ead8', head: 'pagri', beard: true, beardColor: '#3a2a20', skin: C.skin2, walk: walking ? lt * 9 : 0,
    armL: walking ? Math.sin(lt * 9) * 14 : 6, armR: -30, holdR: `<g transform="translate(0 66) rotate(30)">${churn(0, 50, 0.55)}</g>`, smile: lt > 4 ? 1 : 0 })}
  ${bubble(840, 410, 'Assalam-o-Alaikum!', seg(lt, 3.8, 4.2) - seg(lt, 6.8, 7.1))}
  ${bubble(fx - 10, 430, 'Walaikum Assalam!', seg(lt, 5, 5.4) - seg(lt, 7.8, 8.1), true)}
  <!--cap-->${caption(t, 3, 'Area manager ki milk shop par', 'At the area manager’s milk center', 17, 25.5)}`
}

// 4 — the IoT device tests the milk
function scene4(t) {
  const lt = t - 25.5
  const p = easeOut(seg(lt, 1.5, 5.5))
  const rows = [['Temperature', `${(4.2 * p + 25 * (1 - p)).toFixed(1)} °C`], ['pH', (6.68 * p).toFixed(2)], ['Density', `${(1.030 * p).toFixed(3)} g/ml`], ['Conductivity', `${(4.6 * p).toFixed(1)} mS/cm`]]
  const led = Math.floor(lt * 4) % 2 === 0 || lt > 5.6
  const okA = seg(lt, 6, 6.5)
  const probeIn = ease(seg(lt, 0.3, 1.3))
  return `
  <rect width="1280" height="720" fill="#efe4c9"/>
  ${Array.from({ length: 12 }, (_, i) => Array.from({ length: 5 }, (_, j) => `<rect x="${i * 110}" y="${j * 90}" width="106" height="86" fill="${(i + j) % 2 ? '#f5ecd6' : '#ece0c3'}"/>`).join('')).join('')}
  <rect x="0" y="470" width="1280" height="250" fill="#a87648"/><rect x="0" y="460" width="1280" height="18" fill="#8a5a33"/>
  ${churn(300, 470, 2.1)}
  <!-- iot device -->
  <rect x="470" y="370" width="170" height="100" rx="14" fill="#2f3b40"/>
  <rect x="486" y="384" width="100" height="56" rx="6" fill="${led ? '#c7f0d4' : '#9fc9ad'}"/>
  <text x="536" y="418" text-anchor="middle" font-size="18" font-weight="800" fill="${C.deep}">${lt > 5.6 ? 'OK' : 'TEST'}</text><path d="M492 432 ${Array.from({ length: 12 }, (_, i) => `L${492 + i * 8} ${432 - Math.abs(Math.sin(i * 1.7)) * 8 * (i / 12 < p ? 1 : 0)}`).join(' ')}" stroke="${C.forest}" stroke-width="1.6" fill="none"/>
  <circle cx="612" cy="400" r="9" fill="${led ? '#4ade80' : '#1d6b3a'}"/>
  <text x="555" y="460" text-anchor="middle" font-size="12" fill="#cfd8dc">ApnaDairy sensor</text>
  <path d="M470 430 C 420 430, 380 ${lerp(300, 330, probeIn)}, ${lerp(380, 320, probeIn)} ${lerp(290, 330, probeIn)}" stroke="#2f3b40" stroke-width="6" fill="none"/>
  <rect x="${lerp(374, 314, probeIn)}" y="${lerp(250, 300, probeIn)}" width="12" height="60" rx="5" fill="#9aa3a8"/>
  ${lt > 1.2 && lt < 5.8 ? [0, 1, 2].map((i) => { const q = ((lt * 1.4 + i / 3) % 1); return `<circle cx="640" cy="420" r="${20 + q * 70}" fill="none" stroke="${C.forest}" stroke-width="3" opacity="${1 - q}"/>` }).join('') : ''}
  <!-- tablet -->
  <rect x="740" y="90" width="460" height="560" rx="34" fill="#1d2326"/>
  <rect x="758" y="108" width="424" height="524" rx="22" fill="${C.malai}"/>
  <text x="784" y="158" font-size="24" font-weight="800" fill="${C.deep}">Milk test</text>
  <text x="784" y="186" font-size="16" fill="#6a6f5f">Ghulam Rasool, 40 L buffalo milk</text>
  ${rows.map(([k, v], i) => `<g opacity="${seg(lt, 1.3 + i * 0.4, 1.8 + i * 0.4)}"><rect x="784" y="${212 + i * 74}" width="372" height="62" rx="16" fill="${C.cream}"/>
    <text x="804" y="${250 + i * 74}" font-size="19" fill="#6a6f5f">${k}</text><text x="1136" y="${251 + i * 74}" text-anchor="end" font-size="23" font-weight="800" fill="${C.deep}">${v}</text></g>`).join('')}
  <rect x="784" y="520" width="372" height="12" rx="6" fill="${C.cream}"/><rect x="784" y="520" width="${372 * p}" height="12" rx="6" fill="${C.forest}"/>
  ${okA > 0 ? g(`translate(970 584) scale(${lerp(0.6, 1, spring(okA))})`, `<rect x="-186" y="-30" width="372" height="58" rx="29" fill="${C.forest}"/><text x="0" y="8" text-anchor="middle" font-size="22" font-weight="800" fill="${C.cream}">Quality: Achha ✓</text>`, `opacity="${okA}"`) : ''}
  <!--cap-->${caption(t, 4, 'IoT device se doodh ki jaanch', 'Every can tested by the IoT sensor', 25.5, 34.5)}`
}

// 5 — recommended price, farmer agrees, paid on the spot
function scene5(t) {
  const lt = t - 34.5
  const cardA = seg(lt, 0.4, 1.1)
  const nod = lt > 2.6 && lt < 4 ? (lt - 2.6) * 18 : 0
  const press = lt > 4.3 && lt < 4.6
  const paid = seg(lt, 4.8, 5.4)
  const coins = lt > 5 ? Array.from({ length: 10 }, (_, i) => { const q = clamp((lt - 5 - i * 0.08) / 1.2); return q > 0 && q < 1 ? `<circle cx="${640 + Math.cos(i * 1.7) * 260 * q}" cy="${300 - Math.sin(i * 1.3 + 0.5) * 140 * q + 120 * q * q}" r="9" fill="${C.haldi}" stroke="#b07d1c" stroke-width="2" opacity="${1 - q}"/>` : '' }).join('') : ''
  return `
  <rect width="1280" height="720" fill="${C.cream}"/>
  <rect y="0" width="1280" height="70" fill="${C.forest}"/>${Array.from({ length: 28 }, (_, i) => `<path d="M${i * 47.5} 70 h47.5 v30 q-23.75 14 -47.5 0 z" fill="${i % 2 ? C.forest : C.malai}"/>`).join('')}
  <rect x="0" y="520" width="1280" height="200" fill="#a87648"/><rect x="0" y="510" width="1280" height="16" fill="#8a5a33"/>
  ${man({ x: 250, y: 700, s: 1.45, kameez: '#f0ead8', head: 'pagri', beard: true, beardColor: '#3a2a20', skin: C.skin2, nod, smile: lt > 4.8 ? 2 : 0.5, armR: lt > 5.2 ? -40 : 0,
    holdR: lt > 5.2 ? `<rect x="-12" y="58" width="26" height="44" rx="5" fill="#222"/><rect x="-9" y="62" width="20" height="34" rx="3" fill="#c7f0d4"/>` : '' })}
  ${man({ x: 1060, y: 700, s: 1.45, flip: true, kameez: '#f3efe4', vest: C.forest, head: 'cap', beard: true, skin: C.skin1, armR: -62, smile: 1 })}
  ${cardA > 0 ? g(`translate(640 ${lerp(300, 280, easeOut(cardA))}) scale(${lerp(0.7, 1, spring(cardA))})`, `
    <rect x="-250" y="-170" width="500" height="300" rx="30" fill="${C.malai}" stroke="${C.line || '#e6dbc2'}" stroke-width="3"/>
    <text x="0" y="-118" text-anchor="middle" font-size="20" fill="#6a6f5f">AI recommended price</text>
    <text x="0" y="-50" text-anchor="middle" font-size="64" font-weight="800" fill="${C.deep}">Rs 185 / L</text>
    <text x="0" y="0" text-anchor="middle" font-size="22" fill="#6a6f5f">40 L × Rs 185 = <tspan font-weight="800" fill="${C.deep}">Rs 7,400</tspan></text>
    <rect x="${press ? -116 : -120}" y="${press ? 38 : 34}" width="${press ? 232 : 240}" height="${press ? 56 : 62}" rx="31" fill="${lt > 4.3 ? C.haldi : C.forest}"/>
    <text x="0" y="74" text-anchor="middle" font-size="22" font-weight="800" fill="${lt > 4.3 ? C.deep : C.cream}">${lt > 4.3 ? 'Accepted ✓' : 'Accept'}</text>`, `opacity="${cardA}"`) : ''}
  ${bubble(120, 360, 'Theek hai, manzoor!', seg(lt, 2.4, 2.8) - seg(lt, 5, 5.3))}
  ${paid > 0 ? g(`translate(640 ${lerp(720, 520, easeOut(paid))})`, `<rect x="-230" y="-40" width="460" height="80" rx="24" fill="${C.deep}"/><circle cx="-186" cy="0" r="20" fill="${C.haldi}"/><text x="-186" y="7" text-anchor="middle" font-size="20" font-weight="800" fill="${C.deep}">✓</text>
    <text x="-152" y="-6" font-size="21" font-weight="800" fill="${C.cream}">Rs ${Math.round(7400 * easeOut(seg(lt, 4.9, 6))).toLocaleString('en-PK')} paid to Ghulam Rasool</text><text x="-152" y="20" font-size="16" fill="${C.cream}" opacity=".7">Mobile wallet, just now</text>`) : ''}
  ${coins}
  <!--cap-->${caption(t, 5, 'Munasib qeemat, foran adaigi', 'A fair price, paid on the spot', 34.5, 43)}`
}

// 6 — milk becomes stock, listed; businesses bid and homes order
function scene6(t) {
  const lt = t - 43
  const bids = [['Murree Center', 'Rs 191'], ['Taxila Center', 'Rs 188'], ['Your center', 'Rs 186']]
  const batchA = seg(lt, 0.5, 1.2)
  return `
  <rect width="1280" height="720" fill="${C.deep}"/>
  <rect width="1280" height="720" fill="url(#furrow)"/>
  <g transform="translate(0 40)">
  <defs><pattern id="furrow" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="2" height="24" fill="#ffffff" opacity=".05"/></pattern></defs>
  <!-- chiller with batches -->
  <rect x="80" y="110" width="330" height="470" rx="26" fill="#dfe8ea" stroke="#9fb2b7" stroke-width="5"/>
  <rect x="100" y="130" width="290" height="400" rx="14" fill="#cfe8f0"/>
  ${[0, 1, 2].map((i) => churn(170 + i * 76, 300, 0.95)).join('')}
  ${[0, 1, 2].map((i) => churn(170 + i * 76, 500, 0.95)).join('')}
  ${batchA > 0 ? g(`translate(245 ${lerp(640, 600, easeOut(batchA))})`, `<rect x="-170" y="-34" width="340" height="68" rx="20" fill="${C.haldi}"/><text x="0" y="-6" text-anchor="middle" font-size="20" font-weight="800" fill="${C.deep}">Batch 1042, 40 litres</text><text x="0" y="20" text-anchor="middle" font-size="16" fill="${C.deep}">Farm fresh, tested, traced</text>`, `opacity="${batchA}"`) : ''}
  <!-- phone with bulk request -->
  <rect x="520" y="60" width="330" height="610" rx="44" fill="#151a1c"/>
  <rect x="536" y="76" width="298" height="578" rx="32" fill="${C.cream}"/>
  <text x="560" y="130" font-size="16" fill="#6a6f5f">Bulk request</text>
  <text x="560" y="166" font-size="30" font-weight="800" fill="${C.deep}">500 L buffalo</text>
  <text x="560" y="194" font-size="16" fill="#6a6f5f">Hotel in Islamabad, farm fresh</text>
  ${bids.map(([n, p], i) => { const a = seg(lt, 1.6 + i * 0.9, 2.1 + i * 0.9); const mine = i === 2; const won = mine && lt > 5.4
    return a > 0 ? g(`translate(${lerp(90, 0, spring(a))} 0)`, `<rect x="556" y="${226 + i * 92}" width="258" height="76" rx="18" fill="${won ? C.forest : C.malai}" stroke="${mine ? C.haldi : '#e6dbc2'}" stroke-width="${mine ? 4 : 2}"/>
      <text x="576" y="${258 + i * 92}" font-size="17" font-weight="700" fill="${won ? C.cream : C.ink}">${n}</text>
      <text x="576" y="${284 + i * 92}" font-size="15" fill="${won ? C.haldi : '#6a6f5f'}">${won ? 'Bid won ✓' : 'Open offer'}</text>
      <text x="796" y="${272 + i * 92}" text-anchor="end" font-size="22" font-weight="800" fill="${won ? C.haldi : C.deep}">${p}</text>`, `opacity="${a}"`) : '' }).join('')}
  ${lt > 5.4 ? g(`translate(690 585) rotate(-10) scale(${lerp(2.2, 1, spring(seg(lt, 5.4, 6.1)))})`, `<rect x="-78" y="-30" width="156" height="60" rx="10" fill="none" stroke="${C.haldi}" stroke-width="6"/><text x="0" y="14" text-anchor="middle" font-size="36" font-weight="800" fill="${C.haldi}">WON</text>`, `opacity="${seg(lt, 5.4, 5.7)}"`) : ''}
  <!-- home order card -->
  ${seg(lt, 6, 6.6) > 0 ? g(`translate(${lerp(1300, 1060, easeOut(seg(lt, 6, 6.8)))} 380)`, `
    <rect x="-150" y="-150" width="300" height="300" rx="30" fill="${C.malai}"/>
    <text x="-120" y="-104" font-size="16" fill="#6a6f5f">Home order from the app</text>
    <text x="-120" y="-64" font-size="30" font-weight="800" fill="${C.deep}">2 L farm fresh</text>
    <text x="-120" y="-34" font-size="17" fill="#6a6f5f">Ahmed family, G 11</text>
    <rect x="-120" y="0" width="240" height="56" rx="28" fill="${C.haldi}"/><text x="0" y="36" text-anchor="middle" font-size="20" font-weight="800" fill="${C.deep}">Out for delivery</text>
    ${churn(80, 130, 0.6)}`) : ''}
  </g>
  <!--cap-->${caption(t, 6, 'Listing, bids aur ghar ke orders', 'Listed: businesses bid, homes order', 43, 51.5)}`
}

// 7 — delivery through the city to a family's door
function scene7(t) {
  const lt = t - 51.5
  const bx = lerp(-220, 690, easeOut(seg(lt, 0, 4)))
  const riding = lt < 4
  const doorOpen = ease(seg(lt, 4.4, 5.2))
  const handP = ease(seg(lt, 5.6, 7))
  const bottle = (x, y) => `<rect x="${x - 10}" y="${y - 34}" width="20" height="34" rx="6" fill="${C.milk}" stroke="#cfc6b0" stroke-width="2"/><rect x="${x - 6}" y="${y - 42}" width="12" height="9" rx="2" fill="${C.forest}"/>`
  const rx = lerp(1300, -200, seg(lt, 0, 6))
  return `
  <defs><linearGradient id="city" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbd9a0"/><stop offset="1" stop-color="#fff2d9"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#city)"/>
  ${clouds(110, 18, 0.85)}
  ${kite(760, 120, '#d9445a', '#f2c14e', 0)}${kite(1010, 80, '#2f8f5b', '#e2a93b', 2)}${kite(420, 150, '#e2a93b', '#d9445a', 4)}
  <!-- shops with urdu boards -->
  <rect x="0" y="200" width="260" height="400" fill="#e2c6a0"/><rect x="20" y="230" width="220" height="56" rx="6" fill="#2d6b8a"/><text x="130" y="270" text-anchor="middle" font-family="Nastaliq" font-size="30" fill="#fff">کریانہ اسٹور</text>
  <rect x="270" y="250" width="240" height="350" fill="#d6b28a"/><rect x="290" y="276" width="200" height="56" rx="6" fill="#b6332e"/><text x="390" y="316" text-anchor="middle" font-family="Nastaliq" font-size="30" fill="#fff">نان ہاؤس</text>
  <rect x="300" y="380" width="70" height="90" fill="#7aa6b5"/><rect x="410" y="380" width="70" height="90" fill="#7aa6b5"/>
  <!-- electric poles and wires -->
  <rect x="560" y="150" width="10" height="460" fill="#6b6b6b"/><path d="M0 190 Q300 230 565 180 Q900 230 1280 190" stroke="#333" stroke-width="2" fill="none"/><path d="M0 210 Q300 250 565 196 Q900 250 1280 210" stroke="#333" stroke-width="2" fill="none"/>
  <!-- the family's house -->
  <rect x="820" y="230" width="460" height="380" fill="#efe0c4"/>
  <rect x="800" y="214" width="500" height="24" fill="#d5bd94"/>
  <rect x="860" y="290" width="90" height="80" fill="#7aa6b5" stroke="#c9b48c" stroke-width="6"/>
  <circle cx="1240" cy="300" r="46" fill="#c9417a" opacity=".85"/><circle cx="1200" cy="270" r="30" fill="#d9558a"/><circle cx="1260" cy="340" r="28" fill="#b13a6d"/>
  <rect x="1000" y="360" width="150" height="250" fill="#5c3f26"/>
  ${g(`translate(1000 360) scale(${1 - doorOpen * 0.85} 1)`, `<rect width="150" height="250" fill="#2f6b4f"/><circle cx="130" cy="130" r="7" fill="${C.haldi}"/><rect x="18" y="20" width="114" height="90" fill="none" stroke="#24543d" stroke-width="5"/>`)}
  <!-- road -->
  <rect y="600" width="1280" height="120" fill="#6a6d6e"/><rect y="596" width="1280" height="8" fill="#b9a68a"/>
  <!-- qingqi rickshaw passing -->
  ${g(`translate(${rx} 650)`, `<path d="M-80 -110 L60 -110 L80 -40 L-90 -40 Z" fill="#2f8f5b"/><rect x="-86" y="-50" width="170" height="20" fill="${C.haldi}"/><path d="M-70 -100 L50 -100 L60 -60 L-74 -60 Z" fill="#9fc6d6"/><circle cx="-60" cy="-20" r="20" fill="#222"/><circle cx="50" cy="-20" r="20" fill="#222"/>`)}
  ${doorOpen > 0.3 ? `
    ${man({ x: 1040, y: 610, s: 1.05, flip: true, kameez: '#eae4d4', head: 'topi', beard: true, skin: C.skin2, smile: 1, armR: -20 })}
    ${woman({ x: 1110, y: 610, s: 1.02, flip: true, kameez: '#6c4f9e', dupatta: '#c7b6e6', smile: 1 })}
    ${woman({ x: 960, y: 610, s: 0.62, flip: true, kameez: '#e07a3a', dupatta: '#f3c38f', smile: 1, hop: lt > 7 && lt < 8.6 ? -Math.abs(Math.sin((lt - 7) * 6)) * 14 : 0, armL: lerp(0, -60, handP), holdL: handP > 0.95 ? bottle(0, 92) : '' })}` : ''}
  ${bike(riding ? bx : 690, 640, 0.95, lt, riding, riding)}
  ${!riding ? man({ x: 830, y: 610, s: 1, kameez: '#5c7f9a', shalwar: '#4b6a82', head: 'helmet', beard: true, skin: C.skin1, armR: lerp(-10, -80, handP), smile: 1,
    holdR: handP > 0 && handP < 0.95 ? bottle(0, 92) : '' }) : ''}
  ${bubble(1150, 330, 'JazakAllah!', seg(lt, 7.2, 7.6) - seg(lt, 10, 10.4), true)}
  ${lt > 7.4 ? [0, 1, 2].map((i) => { const q = ((lt - 7.4) * 0.6 + i / 3) % 1; return `<path d="M${980 + i * 30} ${420 - q * 120} c-6 -8 -18 -4 -14 6 l14 14 l14 -14 c4 -10 -8 -14 -14 -6z" fill="#d9445a" opacity="${1 - q}"/>` }).join('') : ''}
  <!--cap-->${caption(t, 7, 'Taaza doodh, ghar ki dehleez par', 'Fresh milk at the family’s door', 51.5, 62)}`
}

// 8 — end card
function scene8(t) {
  const lt = t - 62
  const a = easeOut(seg(lt, 0.2, 1.2))
  return `
  <rect width="1280" height="720" fill="${C.deep}"/>
  <rect width="1280" height="720" fill="url(#furrow2)"/>
  <defs><pattern id="furrow2" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="2" height="24" fill="#ffffff" opacity=".05"/></pattern></defs>
  <path d="M0 600 C200 560 420 560 640 590 S1040 560 1280 580 V720 H0 Z" fill="#cfe5d3" opacity=".18"/>
  <path d="M0 640 C260 610 520 620 760 640 S1100 620 1280 630 V720 H0 Z" fill="#cfe5d3" opacity=".28"/>
  ${sun(1060, 170, 50, 0.8)}
  ${g(`translate(640 ${lerp(330, 300, a)}) scale(${lerp(0.4, 1, spring(seg(lt, 0.1, 1.3)))})`, `${churn(0, 0, 1.6)}`, `opacity="${a}"`)}
  <text x="640" y="410" text-anchor="middle" font-size="84" font-weight="800" fill="${C.cream}">${'ApnaDairy'.split('').map((ch, i) => { const q = easeOut(seg(lt, 0.4 + i * 0.07, 0.9 + i * 0.07)); return `<tspan dy="${i === 0 ? 0 : 0}" opacity="${q}">${ch}</tspan>` }).join('')}</text>
  <text x="640" y="470" text-anchor="middle" font-family="Nastaliq" font-size="38" fill="${C.haldi}" opacity="${seg(lt, 0.8, 1.6)}">اپنا ڈیری   خالص دودھ</text>
  <text x="640" y="548" text-anchor="middle" font-size="26" fill="${C.cream}" opacity="${seg(lt, 1.4, 2.2) * 0.85}">Farm se ghar tak, har qadam record par.</text>
  <text x="640" y="584" text-anchor="middle" font-size="20" fill="${C.cream}" opacity="${seg(lt, 1.8, 2.6) * 0.6}">From the farm to your home, every step on record.</text>`
}

const scenes = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8]
// [start zoom, end zoom, focus x, focus y] for each scene
const CAMERA = [[1.0, 1.07, 820, 520], [1.02, 1.0, 700, 560], [1.0, 1.06, 760, 450], [1.0, 1.1, 960, 360], [1.0, 1.05, 640, 340], [1.04, 1.0, 640, 360], [1.0, 1.06, 960, 470], [1.06, 1.0, 640, 360]]

// opening title: "Farm se ghar tak" over a dawn sky, before scene 1
function intro(t) {
  const a = easeOut(seg(t, 0.2, 1.2)), u = easeOut(seg(t, 0.8, 1.8)), l = easeOut(seg(t, 1.2, 2.2))
  const words = ['Farm', 'se', 'ghar', 'tak']
  return `
  <defs><linearGradient id="introSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a28"/><stop offset="1" stop-color="#2a5a3f"/></linearGradient>
  <pattern id="introFurrow" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="2" height="24" fill="#ffffff" opacity=".05"/></pattern></defs>
  <rect width="1280" height="720" fill="url(#introSky)"/><rect width="1280" height="720" fill="url(#introFurrow)"/>
  ${sun(1010, lerp(600, 520, easeOut(seg(t, 0, 3.5))), 56, 0.9)}
  <path d="M0 560 C220 520 420 525 640 545 S1040 520 1280 540 V720 H0 Z" fill="#cfe5d3" opacity=".22"/>
  <path d="M0 610 C260 585 520 590 760 605 S1100 590 1280 600 V720 H0 Z" fill="#cfe5d3" opacity=".34"/>
  <text x="640" y="330" text-anchor="middle" font-size="104" font-weight="800" fill="${C.cream}">${words.map((w, i) => {
    const q = easeOut(seg(t, 0.25 + i * 0.16, 0.85 + i * 0.16))
    return `<tspan fill="${i === 2 ? C.haldi : C.cream}" fill-opacity="${q}">${i ? ' ' : ''}${w}</tspan>`
  }).join('')}</text>
  <text x="640" y="${lerp(424, 412, u)}" text-anchor="middle" font-family="Nastaliq" font-size="44" fill="${C.haldi}" opacity="${u}">فارم سے گھر تک</text>
  <text x="640" y="470" text-anchor="middle" font-size="22" fill="${C.cream}" opacity="${l * 0.75}">The journey of a litre of milk with ApnaDairy</text>`
}

function render(t) {
  setT(t)
  let out = ''
  if (t < INTRO + 0.7) out += `<g opacity="${1 - seg(t, INTRO, INTRO + 0.7)}">${intro(t)}</g>`
  t -= INTRO
  SCENES.forEach(([a, b], i) => {
    if (t >= a && t < b + 0.6) {
      const alpha = ease(seg(t, a, a + 0.6))
      const [art, cap = ''] = scenes[i](t).split('<!--cap-->')
      const [z0, z1, fx, fy] = CAMERA[i]
      const z = lerp(z0, z1, ease(seg(t, a, b + 0.6)))
      out += `<g opacity="${alpha}"><g transform="translate(${fx} ${fy}) scale(${z}) translate(${-fx} ${-fy})">${art}</g>${cap}</g>`
    }
  })
  // fade from and to black at the very start and end
  const black = Math.max(1 - seg(t + INTRO, 0, 0.5), seg(t + INTRO, DURATION - 0.8, DURATION))
  // soft vignette for depth, then fade from/to black at the very start and end
  out += `<rect width="1280" height="720" fill="url(#vig)"/><rect width="1280" height="720" fill="#000" opacity="${black}"/>`
  document.getElementById('stage').innerHTML = `<defs><radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>` + out
}
window.render = render
window.DURATION = DURATION
