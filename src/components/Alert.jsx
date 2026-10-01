export default function Alert({ type = 'error', children }) {
  if (!children) return null
  const styles = type === 'error'
    ? 'bg-danger/10 text-danger border-danger/20'
    : 'bg-mint-soft text-forest border-mint'
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>
}
