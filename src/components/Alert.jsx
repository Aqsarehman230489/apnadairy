export default function Alert({ type = 'error', children }) {
  if (!children) return null
  const styles = type === 'error'
    ? 'bg-[#f8e4e0] text-danger border-[#efc9c1]'
    : 'bg-mint-soft text-forest border-mint'
  return <div role="alert" className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>
}
