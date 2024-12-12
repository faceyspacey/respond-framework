import { syncRef } from '../../store/plugins/edit/index.js'
import { updatedObjects } from '../createProxy.js'


export default (vl, branch, isTop) => {
  modulateUpdates[branch] ??= vl
  if (isTop) queueNotification(vl, branch)
}


// let modulateUpdates = {}
let pending = 0

export const clearPending = () => pending = 0


const queueNotification = () => {
  if (pending) return pending = 2 // every time more are queued, we set pending status to 2 to signal to prolong capture time below, as there's a high possibility for more consecutive near instant changes

  pending = 1

  const queued = () => {
    if (!pending) return // a subsequent sync event notified listeners before dequeued (see respond.notifyListeners + edit plugin)

    if (pending === 2) { // batch subsequent dispatches + event callbacks/plugins that are essentially instant and will only require a single notification to listeners/components
      pending = 1
      allowGracePeriod(queued) // allow sufficient "time" for batching, catpuring several microtasks (ie near-instant promises)
      return
    }

    pending = 0
    notify()
  }

  allowGracePeriod(queued)
}


const allowGracePeriod = fn => Promise.resolve().then().then().then().then().then(fn)


const notify = () => {
  const start = performance.now()
  const uniqueComponents = new Set

  updatedObjects.forEach(orig => {
    componentListeners.get(orig)?.forEach(listener => uniqueComponents.add(listener))
  })

  uniqueComponents.forEach(listener => listener())

  updatedObjects.clear()
  log(start)
}



const queueNotificationReplayTools2 = function(vl) {
  if (syncRef.sync) return
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
    log(start)
  }

  Promise.resolve().then().then().then().then().then(queued)
}



const log = start => queueMicrotask(() => console.log('queueNotification.render', parseFloat((performance.now() - start).toFixed(3))))