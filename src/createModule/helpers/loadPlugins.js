import { traverseModulesAsyncParallel } from './traverse.js'


const loaded = Symbol('pluginsLoaded') // preserve through HMR, but not replays nor sessionStorage.getItem('sessionState')

export default respond => {
  if (respond.ctx[loaded]) return
  respond.ctx[loaded] = true

  return traverseModulesAsyncParallel(respond.topState, state => {
    const promises = state.plugins.map(p => p.load?.(state))
    return Promise.all(promises)
  })
}