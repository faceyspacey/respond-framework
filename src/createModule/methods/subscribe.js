import { _branch } from '../reserved.js'


export default function subscribe(send, allReductions = false) { // notifications on trigger events only by default
  send.module = this.state
  send.branch = this.branch // branch of module attached to `respond` object unique to each module
  send.allReductions = allReductions
  
  this.subscribers.push(send)

  return () => {
    const index = this.subscribers.findIndex(l => l === send)
    this.subscribers.splice(index, 1)
  }
}


export function notify(e) {  
  this.devtools.send(e)

  if (this.subscribers.length === 0) return

  const { event } = e

  if (event.sync && !event.notifyReduce) return // by default sync events don't trigger notifyReduce
  if (event === this.state.events.init) return

  const branch = event[_branch]
  const isTrigger = e.meta.trigger

  const sent = this.subscribers
    .filter(send =>
      branch.indexOf(send.branch) === 0 && // event is child of subscribed module or the same module
      send.allReductions || isTrigger
    )
    .map(send => send(send.module, e))

  if (sent.length === 0) return
  this.promises.push(...sent)
}