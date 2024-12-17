export default function subscribe(send, triggerOnly = true) {
  send.module = this.state
  send.branch = this.state.branch // branch of module attached to `respond` object unique to each module
  send.triggerOnly = triggerOnly
  
  this.subscribers.push(send)

  return () => {
    const index = this.subscribers.findIndex(l => l === send)
    this.subscribers.splice(index, 1)
  }
}


export function notify(e) {  
  this.devtools.send(e)

  const { event } = e

  if (event.sync && !event.notifyReduce) return // by default sync events don't trigger notifyReduce
  if (event === this.state.events.init) return

  const sent = this.subscribers
    .filter(send =>
      e.event[_branch].indexOf(send.branch) === 0 && // event is child of subscribed module or the same module
      !send.triggerOnly || e.meta.trigger
    )
    .map(send => send(send.module, e))

  if (sent.length > 0) this.promises.push(...sent)
}