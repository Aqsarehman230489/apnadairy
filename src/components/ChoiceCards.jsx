// radio group rendered as selectable cards: options = [{ value, label, hint }]
export default function ChoiceCards({ options, value, onChange, name, cols = 3 }) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[cols]
  return (
    <div className={`grid gap-2 ${grid}`} role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`relative rounded-2xl border-[1.5px] px-4 py-3 text-left transition-all active:scale-[.98] ${
              on ? 'border-forest bg-mint-soft shadow-[0_6px_18px_-12px_rgb(31_77_54/.8)]' : 'border-line bg-white hover:border-[#cdbd98]'}`}>
            <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border-[1.5px] transition-colors ${on ? 'border-forest bg-forest' : 'border-line bg-white'}`}>
              {on && <span className="h-2 w-2 rounded-full bg-haldi" />}
            </span>
            <p className={`pr-6 text-[15px] font-semibold ${on ? 'text-forest' : 'text-ink'}`}>{o.label}</p>
            {o.hint && <p className="mt-0.5 text-[13px] leading-snug text-muted">{o.hint}</p>}
          </button>
        )
      })}
    </div>
  )
}
