import { MilkChurn } from './Farm'

export default function Loader({ label = 'Loading' }) {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <span className="animate-bounce motion-reduce:animate-none"><MilkChurn size={40} /></span>
        {label}…
      </div>
    </div>
  )
}
