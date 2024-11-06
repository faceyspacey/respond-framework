import { traverseModulesAsyncParallel } from './sliceByModulePath.js'

const loaded = Symbol('pluginsLoaded') // preserve through HMR, but not replays nor sessionStorage.getItem('sessionState')

export default top => {
  if (top[loaded]) return
  top[loaded] = true

  return traverseModulesAsyncParallel(top, state => {
    const promises = state.plugins.map(p => p.load?.(state))
    return Promise.all(promises)
  })
}