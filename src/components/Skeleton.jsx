// placeholder rows while data loads
export function SkeletonRows({ cols, rows = 4 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c}><div className="skeleton h-4" style={{ width: `${45 + ((r * 7 + c * 13) % 45)}%` }} /></td>
      ))}
    </tr>
  ))
}

export function SkeletonBlock({ className = 'h-24' }) {
  return <div className={`skeleton ${className}`} />
}
