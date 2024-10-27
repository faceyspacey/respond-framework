export default ([...plugins], state, e) => {
  return next()

  function next(r) {
    const plugin = plugins.shift()
    if (!plugin) return

    e = r ? { ...e, ...r } : e

    const moduleState = plugin.state ?? state
    const res = plugin(moduleState, e, next)

    return res instanceof Promise
      ? res.then(res => res !== false && next(res))
      : res !== false && next(res) // input edit plugins come first, and function correctly (no jumps), because async plugins come after
  }
}