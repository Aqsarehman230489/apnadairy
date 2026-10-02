import { MilkChurn } from './Farm'

export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-cream/10' : 'bg-forest'}`}>
        <MilkChurn size={26} body="#fffcf4" band="#e2a93b" stroke={light ? '#fffcf4' : '#173a28'} />
      </span>
      <span className={`display text-[22px] ${light ? 'text-cream' : 'text-forest-deep'}`}>
        ApnaDairy
      </span>
    </div>
  )
}
