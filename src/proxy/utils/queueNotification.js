export default function(vl, queuedBranch) {
  vl.queuedBranch = vl.queuedBranch !== undefined
      ? vl.queuedBranch === queuedBranch ? queuedBranch : null // if multiple branches are mutated in same batch, we can no longer optimize to only notify listeners of the same branch lineage
      : queuedBranch

  if (vl.pending) return vl.pending++ // additional gaps for microtasks will be added based on the number of pending, allowing more time to capture what's really a single notification to components
    
  vl.pending = 1

  const queued = () => {
    if (!vl.pending) return // a subsequent sync event notified listeners before dequeued (see respond.notifyListeners + edit plugin)

    if (vl.pending > 1) { // batch subsequent dispatches + event callbacks/plugins that are essentially instant and will only require a single notification to listeners/components
      vl.pending = 1
      return Promise.resolve().then().then().then().then().then(queued) // allow sufficient "time" for batching, catpuring several microtasks (ie near-instant promises)
    }

    vl.pending = 0
    
    const start = performance.now()

    if (vl.queuedBranch === null) {
      console.log('not_ignored.null')
      vl.listeners.forEach(listener => listener())
    }
    else {
      vl.listeners.forEach(listener => {
        const { ignoreParents, isolated, branch } = listener.respond

        if (isolated && !isAncestorOrSelf(branch, vl.queuedBranch)) return console.log('ignored.isolated/not_ancestor')
        if (ignoreParents && !isChildOrSelf(branch, vl.queuedBranch)) return console.log('ignored.ignoreParents')

        listener() // only notify listeners of same branch lineage or not isolated modules
      })
    }

    delete vl.queuedBranch
    delete vl.queuedRpt

    queueMicrotask(() => console.log('createProxy.render', parseFloat((performance.now() - start).toFixed(3))))
  }

  Promise.resolve().then().then().then().then().then(queued)
}


export const queueNotificationReplayTools = function(vl) {
  if (vl.pending) return vl.pending++

  vl.pending = 1

  const queued = () => {
    if (!vl.pending) return // a subsequent sync event notified listeners before dequeued (see respond.notifyListeners + edit plugin)

    if (vl.pending > 1) { // batch subsequent dispatches + event callbacks/plugins that are essentially instant and will only require a single notification to listeners/components
      vl.pending = 1
      return Promise.resolve().then().then().then().then().then(queued) // allow sufficient "time" for batching, catpuring several microtasks (ie near-instant promises)
    }

    vl.pending = 0
    
    const start = performance.now()
    vl.replayToolsListeners.forEach(listener => listener())
    queueMicrotask(() => console.log('replayTools.render', parseFloat((performance.now() - start).toFixed(3))))
  }

  Promise.resolve().then().then().then().then().then(queued)
}