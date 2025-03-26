import { isTest } from '../../helpers/constants.js'


export default (branch, respond) => {
  updated.add(branch) // add branch to set -- branch rendered once, no matter how many changes made to it in a single batch
  if (isTest) return // tests commit themselves to speed up tests
  if (respond.ctx.sync) return // sync events dispatch as a batch in edit plugin so inputs dont jump
  enqueue(respond)
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

    respond.commit()
  }
}


export function commit(start = performance.now()) {
  const { responds } = this

  const listeningBranches = createListeningBranches(responds, this)
  const branches = Object.keys(listeningBranches).reverse()  // notify top to bottom, in case there's any marginal perf benefits internal to React, i.e. not having to compare snapshots of parents again (note: respond.ancestorsListening is first ordered bottom up)

  branches.forEach(branch => { // note: React is smart enough to always render from top to bottom, regardless of the tree position of component and order that these callbacks are fired (note: `listener' is the callback function passed to `subscribe` in `useSyncExternalStore(subscribe, getSnapshot)` in `useSnapshot`); also ordering is still correct even in non-syncronous separate microtasks, which is the basis for React's "time slicing" capabilities
    const { listeners } = responds[branch]
    listeners.forEach(listener => listener())
  })

  pending = 0
  updated.clear() // clear for next batch
}



const createListeningBranches = (responds, respond) => {
  const branches = {}
  
  updated.forEach(branch => {
    const respond = responds[branch]
    Object.assign(branches, respond.ancestorsListening)
  })

  scheduleReplayToolsSeparately(branches, respond)

  return branches
}


const scheduleReplayToolsSeparately = (listeningBranches, respond) => {
  if (!listeningBranches.replayTools) return
  if (respond.ctx.sync && updated.size === 1) return // must be handled sync if replayTools is the only branch updated, as it means one of its inputs is being edited -- note: however, if sync, but the main application's inputs are edited, we can still queue a microtask to render replayTools separately

  delete listeningBranches.replayTools

  queueMicrotask(() => queueMicrotask(() => { // needs 2 tasks to hop over main render log (note: render duration logging is now removed, so we dont need 2 microtasks, but we will keep it for now)
    respond.responds.replayTools.listeners.forEach(listener => listener())
  }))
}



let updated = new Set
let pending = 0

const dequeue = fn => Promise.resolve().then().then().then().then().then().then().then().then().then().then().then().then(fn)