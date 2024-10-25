import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import defaultPlugins from '../../store/plugins/index.js'
import { _parent } from '../../store/reserved.js'


export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, ...defaultPlugins]

export const ignoreParents = true

export const initialState = state => ({
  form: state.replays.settings,
  evsIndex: -1,
  evs: [],
  divergentIndex: undefined,
})

export function findLastEvent() {
  return this.evs[this.evsIndex]
}

export const selectors = {
  get playing() {
    return this[_parent].replays.playing
  }
}

// export function playing() {
//   return this[_parent].replays.playing
// }