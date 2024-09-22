import sliceByModulePath, { sliceEventByModulePath } from '../../utils/sliceByModulePath.js'


export function subscribe(send) {
  send.modulePath = this.modulePath
  this.listeners.push(send)

  return () => {
    const index = this.listeners.findIndex(l => l === send)
    this.listeners.splice(index, 1)
  }
}


export function notify(e) {
  const state = this.getStore()

  const sent = state.listeners.map(send => {
    const isSelfOrAncestor = e.modulePath.indexOf(send.modulePath) === 0
    if (!isSelfOrAncestor) return
    
    const storeSlice = sliceByModulePath(state, send.modulePath)
    const eSlice = sliceEventByModulePath(e, send.modulePath)

    return send(storeSlice, eSlice)
  })

  const promise = Promise.all(sent).catch(error => {
    state.onError({ error, kind: 'subscriptions', e })
  })

  if (state.shouldAwait()) return promise
}