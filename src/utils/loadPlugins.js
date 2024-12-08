import { traverseModulesAsyncParallel } from './sliceBranch.js'

const loaded = Symbol('pluginsLoaded') // preserve through HMR, but not replays nor sessionStorage.getItem('sessionState')

export default respond => {
  if (respond.ctx[loaded]) return
  respond.ctx[loaded] = true

  const top = respond.getStore()

  return traverseModulesAsyncParallel(top, state => {
    const promises = state.plugins.map(p => p.load?.(state))
    return Promise.all(promises)
  })
}