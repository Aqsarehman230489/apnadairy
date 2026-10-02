import CountUp from './CountUp'

export function StatRow({ children, cols = 4 }) {
  const c = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[cols]
  return <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${c}`}>{children}</div>
}

// value can be a number (animated) or text; format applies to numbers
export default function StatCard({ label, value, note, format, tone = 'plain', icon }) {
  const tones = {
    plain: 'bg-surface border-line',
    green: 'bg-forest text-cream border-forest',
    haldi: 'bg-haldi-soft border-[#efd59a]',
  }
  return (
    <div className={`animate-rise rounded-[20px] border px-5 py-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[13px] font-medium ${tone === 'green' ? 'text-cream/75' : 'text-muted'}`}>{label}</p>
        {icon}
      </div>
      <p className="display num mt-2 text-[32px]">
        {typeof value === 'number' ? <CountUp value={value} format={format} /> : (value ?? '—')}
      </p>
      {note && <p className={`mt-0.5 text-[12.5px] ${tone === 'green' ? 'text-cream/70' : 'text-muted'}`}>{note}</p>}
    </div>
  )
}
