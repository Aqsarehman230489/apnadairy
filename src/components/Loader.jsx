export default function Loader({ label = 'Loading' }) {
  return (
    <div className="grid min-h-full place-items-center bg-cream" role="status">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-forest motion-reduce:animate-none" />
        {label}…
      </div>
    </div>
  )
}
