export default function Alert({ type = 'error', children }) {
  if (!children) return null
  const styles = type === 'error' ? 'bg-[#f8e2dc] text-danger' : 'bg-mint-soft text-forest'
  return <div role="alert" className={`animate-pop rounded-2xl px-4 py-3 text-[14px] ${styles}`}>{children}</div>
}
