// tab-style filter: options = [{ value, label, count? }]
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-[10px] bg-cream-2 p-1" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-[7px] px-3 py-1.5 text-[13px] transition-colors ${
            value === o.value ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(21_35_43/.08)]' : 'text-muted hover:text-ink'}`}>
          {o.label}
          {o.count != null && <span className="num ml-1.5 text-muted">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
