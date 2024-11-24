export default ([...plugins], s, e) => {
  return next()

  function next(r) {
    const plugin = plugins.shift()
    if (!plugin) return

    const state = plugin.state ?? s
    
    e = r ? { ...e, ...r } : e,             // merge returns of plugins for subsequent plugins (e assignment used in next plugin)
    r = plugin.call(state, state, e, next)  // props.plugins are spliced into all descendant modules, so pass state of the original module ?? state of event's module
   
    return r instanceof Promise
      ? r.then(r => r !== false && next(r))
      : r !== false && next(r)              // input edit plugins come first, and function correctly (no jumps), because async plugins come after
  }
}