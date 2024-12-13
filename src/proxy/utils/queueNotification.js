export default (branch, respond) => {
  updated[branch] = true
  enqueue(respond)
}

const enqueue = respond => {
  if (pending) return pending = 2 // every time more are queued, we set pending status to 2 to signal to prolong capture time below, as there's a high possibility for more consecutive near instant changes

  pending = 1

  const notify = () => {
    if (!pending) return // a subsequent sync event notified listeners before dequeued (see respond.notifyListeners + edit plugin)

    if (pending === 2) { // batch subsequent dispatches + event callbacks/plugins that are essentially instant and will only require a single notification to listeners/components
      pending = 1
      return dequeue(notify) // allow sufficient "time" for batching, catpuring several microtasks (ie near-instant promises)
    }

    pending = 0
    commit(respond)
  }

  dequeue(notify)
}

const commit = (respond, start = performance.now()) => {
  const { responds } = respond
  const listeningBranches = createListeningBranches(responds)

  const hasReplayTools = listeningBranches.replayTools
  delete listeningBranches.replayTools
  
  Object.values(responds).forEach(respond => {
    const { branch, listeners } = respond
    if (!listeningBranches[branch]) return
    listeners.forEach(listener => listener())
  })

  updated = {}
  log(start, listeningBranches)

  if (hasReplayTools) {
    queueMicrotask(() => {
      const st = performance.now()
      responds.replayTools.listeners.forEach(listener => listener())
      log(st, undefined, '.replayTools')
    })
  }
}


let updated = {}
let pending = 0

export const clearPending = () => pending = 0

const dequeue = fn => Promise.resolve().then().then().then().then().then(fn)

const log = (start, listeningBranches, postFix = '') => queueMicrotask(() => console.log('queueNotification.render' + postFix, performance.now() - start, listeningBranches))

const createListeningBranches = responds => {
  const branches = {}
  
  Object.keys(updated).forEach(branch => {
    const respond = responds[branch]
    Object.assign(branches, respond.ancestorsListening)
  })

  return branches
}