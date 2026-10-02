import { useCallback, useEffect, useState } from 'react'

// runs an async loader, exposes { data, error, loading, reload }
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      setState({ data: await run(), error: '', loading: false })
    } catch (e) {
      setState({ data: null, error: e.message, loading: false })
    }
  }, [run])

  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}
