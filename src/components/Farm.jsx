// hand-drawn-style farm motifs (inline svg, no images)

// the classic aluminium milk churn ("doodh ka dabba")
export function MilkChurn({ size = 48, body = '#fffcf4', band = '#e2a93b', stroke = '#1f4d36', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="16" y="3.5" width="16" height="5" rx="2" fill={band} stroke={stroke} strokeWidth="1.6" />
      <rect x="19" y="8.5" width="10" height="6" fill={body} stroke={stroke} strokeWidth="1.6" />
      <path d="M19 14.5 14 21v20a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V21l-5-6.5z" fill={body} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="14" y="28" width="20" height="3.5" fill={band} stroke={stroke} strokeWidth="1.6" />
      <path d="M14 22.5c-3.6 0-5 2-5 4.5M34 22.5c3.6 0 5 2 5 4.5" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21 18v8" stroke={stroke} strokeOpacity=".25" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// layered fields, sun and churns — drawn for a dark green background
export function FarmScene({ className = '' }) {
  return (
    <svg viewBox="0 0 640 360" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <circle cx="505" cy="178" r="68" fill="#e2a93b" opacity=".12" />
      <circle cx="505" cy="178" r="46" fill="#e2a93b" />
      {/* far hills */}
      <path d="M0 210c80-40 150-52 230-30s140 34 220 8 140-30 190-14v186H0z" fill="#cfe5d3" opacity=".14" />
      {/* middle field with furrows */}
      <path d="M0 250c110-46 230-50 340-26s200 20 300-10v146H0z" fill="#cfe5d3" opacity=".22" />
      <g stroke="#173a28" strokeOpacity=".35" strokeWidth="2" fill="none">
        <path d="M60 262c70-18 150-24 230-14" /><path d="M40 282c90-20 190-26 290-12" /><path d="M360 252c80 8 170 6 260-16" />
      </g>
      {/* near ground */}
      <path d="M0 300c120-26 250-30 380-16s180 10 260-4v80H0z" fill="#cfe5d3" opacity=".34" />
      {/* fence */}
      <g stroke="#fffcf4" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round">
        <path d="M410 296v-34M450 293v-34M490 291v-34M530 290v-34M570 289v-34" />
        <path d="M400 270c60-4 120-6 180-8M400 284c60-4 120-6 180-8" strokeWidth="2.4" />
      </g>
      {/* churns at the farm gate */}
      <g transform="translate(150 230) scale(1.9)"><MilkChurnShape /></g>
      <g transform="translate(222 248) scale(1.45)"><MilkChurnShape /></g>
      {/* grass tufts */}
      <g stroke="#cfe5d3" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M90 318l4-12 3 12 5-9M330 312l3-10 4 10 4-8M600 306l3-10 3 10" />
      </g>
    </svg>
  )
}

function MilkChurnShape() {
  return (
    <g>
      <rect x="16" y="3.5" width="16" height="5" rx="2" fill="#e2a93b" />
      <rect x="19" y="8.5" width="10" height="6" fill="#fffcf4" />
      <path d="M19 14.5 14 21v20a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V21l-5-6.5z" fill="#fffcf4" />
      <rect x="14" y="28" width="20" height="3.5" fill="#e2a93b" />
      <path d="M21 18v8" stroke="#173a28" strokeOpacity=".2" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  )
}

// thin rolling-hills strip for page banners
export function HillsStrip({ className = '' }) {
  return (
    <svg viewBox="0 0 400 120" className={className} aria-hidden preserveAspectRatio="xMaxYMax slice">
      <circle cx="320" cy="40" r="22" fill="#e2a93b" />
      <path d="M0 90c60-28 120-34 190-20s130 16 210-6v56H0z" fill="#cfe5d3" opacity=".22" />
      <path d="M120 104c70-18 150-20 280-8v24H120z" fill="#cfe5d3" opacity=".38" />
      <g transform="translate(250 66) scale(.95)"><MilkChurnShape /></g>
    </svg>
  )
}
