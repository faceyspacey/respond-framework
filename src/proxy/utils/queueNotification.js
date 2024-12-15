import { syncRef } from '../../store/plugins/edit/index.js'


let updated = new Set
let pending = 0


export default (branch, respond) => {
  updated.add(branch)
  syncRef.sync ? commit(respond) : enqueue(respond)
}

const enqueue = respond => {
  if (pending) return pending = 2 // every time more are queued, we set pending status to 2 to signal to prolong capture time below, as there's a high possibility for more consecutive near instant changes
  
  pending = 1
  dequeue(notify)

  function notify() {
    if (pending === 0) return // subsequent sync event immediately committed before dequeued

    if (pending === 2) { // batch subsequent dispatches + event callbacks/plugins that are essentially instant and will only require a single notification to listeners/components
      pending = 1
      return dequeue(notify) // allow sufficient "time" for batching, catpuring several microtasks (ie near-instant promises)
    }

    commit(respond)
  }
}

const commit = (respond, start = performance.now()) => {
  pending = 0

  const { responds } = respond
  const listeningBranches = createListeningBranches(responds)
  
  listeningBranches.forEach(branch => { // note: React is smart enough to always render from top to bottom, regardless of the tree position / order that these callbacks are fired (note: `listener' is the callback function passed to `subscribe` in `useSyncExternalStore(subscribe, getSnapshot)` in `useSnapshot`); also ordering is still correct even in non-syncronous separate microtasks, which is the basis for React's "time slicing" capabilities
    const { listeners } = responds[branch]
    listeners.forEach(listener => listener())
  })

  log(start, listeningBranches)
}


const dequeue = fn => Promise.resolve().then().then().then().then().then(fn)

const log = (start, listeningBranches, postFix = '') => queueMicrotask(() => console.log('queueNotification.render' + postFix, performance.now() - start, listeningBranches))

const createListeningBranches = responds => {
  const branches = {}
  
  updated.forEach(branch => {
    const respond = responds[branch]
    Object.assign(branches, respond.ancestorsListening)
  })

  queueReplayToolsSeparately(responds, branches)

  updated.clear() // clear for next batch

  return Object.keys(branches).reverse() // notify top to bottom, in case there's any marginal perf benefits internal to React (note: respond.ancestorsListening was originally ordered bottom up)
}


const queueReplayToolsSeparately = (responds, listeningBranches) => {
  if (!listeningBranches.replayTools) return

  if (syncRef.sync && updated.size === 1) return // must be handled sync if replayTools is the only branch updated, as it means one of its inputs is being edited -- note: however, if sync, but the main application's inputs are edited, we can still queue a microtask to render replayTools separately

  delete listeningBranches.replayTools

  queueMicrotask(() => queueMicrotask(() => { // needs 2 tasks to hop over main render log
    const start = performance.now()
    responds.replayTools.listeners.forEach(listener => listener())
    log(start, undefined, '.replayTools')
  }))
}